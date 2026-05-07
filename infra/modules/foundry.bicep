// Microsoft Foundry — AI Hub + Project + model deployments
// NO Azure OpenAI resources — all inference goes through the Foundry project endpoint.
@description('Name prefix for resources')
param namePrefix string

@description('Azure region')
param location string

@description('Tags applied to every resource')
param tags object = {}

@description('Subnet ID for private endpoints')
param privateEndpointSubnetId string

@description('Private DNS zone resource ID for Cognitive Services')
param privateDnsZoneOpenAIId string

@description('Model deployments — array of {name, modelName, modelVersion, capacity}')
param modelDeployments array

// --- AI Services account (kind: AIServices, NOT OpenAI) ---
resource aiServices 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: '${namePrefix}ais'
  location: location
  tags: tags
  kind: 'AIServices'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: '${namePrefix}ais'
    publicNetworkAccess: 'Disabled'
    disableLocalAuth: true
    networkAcls: {
      defaultAction: 'Deny'
    }
  }
}

// --- Model deployments (parameterized — 3 models by default) ---
@batchSize(1)
resource deployments 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = [for model in modelDeployments: {
  parent: aiServices
  name: model.name
  sku: {
    name: 'GlobalStandard'
    capacity: model.capacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: model.modelName
      version: model.modelVersion
    }
    versionUpgradeOption: 'OnceCurrentVersionExpired'
  }
}]

// --- Private endpoint for AI Services ---
resource peAiServices 'Microsoft.Network/privateEndpoints@2024-01-01' = {
  name: '${namePrefix}pe-ais'
  location: location
  tags: tags
  dependsOn: deployments // Wait for all deployments to complete
  properties: {
    subnet: { id: privateEndpointSubnetId }
    privateLinkServiceConnections: [
      {
        name: '${namePrefix}pe-ais'
        properties: {
          privateLinkServiceId: aiServices.id
          groupIds: [ 'account' ]
        }
      }
    ]
  }
}

resource peAiServicesDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-01-01' = {
  parent: peAiServices
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'cognitiveservices'
        properties: { privateDnsZoneId: privateDnsZoneOpenAIId }
      }
    ]
  }
}

output aiServicesId string = aiServices.id
output aiServicesAccountName string = aiServices.name
output endpoint string = aiServices.properties.endpoint
output deploymentNames array = [for (model, i) in modelDeployments: model.name]

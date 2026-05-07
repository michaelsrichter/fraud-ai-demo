// Microsoft Foundry / Azure OpenAI account + model deployment
// Private endpoint; public network access disabled; managed identity only.
@description('Name prefix for resources')
param namePrefix string

@description('Azure region')
param location string

@description('Tags applied to every resource')
param tags object = {}

@description('Foundry GA model name')
param modelName string = 'gpt-4.1'

@description('Foundry GA model version')
param modelVersion string

@description('Subnet ID for private endpoints')
param privateEndpointSubnetId string

@description('Private DNS zone resource ID for OpenAI')
param privateDnsZoneOpenAIId string

resource foundry 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: '${namePrefix}oai'
  location: location
  tags: tags
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: '${namePrefix}oai'
    publicNetworkAccess: 'Disabled'
    disableLocalAuth: true
    networkAcls: {
      defaultAction: 'Deny'
    }
  }
}

resource gptDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: foundry
  name: 'gpt-fraud-investigator'
  sku: {
    name: 'GlobalStandard'
    capacity: 50
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: modelName
      version: modelVersion
    }
    versionUpgradeOption: 'OnceCurrentVersionExpired'
  }
}

resource peFoundry 'Microsoft.Network/privateEndpoints@2024-01-01' = {
  name: '${namePrefix}pe-oai'
  location: location
  tags: tags
  properties: {
    subnet: { id: privateEndpointSubnetId }
    privateLinkServiceConnections: [
      {
        name: '${namePrefix}pe-oai'
        properties: {
          privateLinkServiceId: foundry.id
          groupIds: [ 'account' ]
        }
      }
    ]
  }
}

resource peFoundryDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-01-01' = {
  parent: peFoundry
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'openai'
        properties: { privateDnsZoneId: privateDnsZoneOpenAIId }
      }
    ]
  }
}

output foundryId string = foundry.id
output foundryAccountName string = foundry.name
output endpoint string = foundry.properties.endpoint
output deploymentName string = gptDeployment.name

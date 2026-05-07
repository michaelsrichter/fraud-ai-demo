// Microsoft Foundry / Azure OpenAI account + GA model deployment
@description('Name prefix for resources')
param namePrefix string

@description('Azure region')
param location string

@description('Tags applied to every resource')
param tags object = {}

@description('Foundry GA model name (e.g., gpt-4.1)')
param modelName string = 'gpt-4.1'

@description('Foundry GA model version')
param modelVersion string

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
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: true
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

output foundryId string = foundry.id
output endpoint string = foundry.properties.endpoint
output deploymentName string = gptDeployment.name

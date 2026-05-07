// Azure Functions Flex Consumption + Application Insights + Log Analytics
// VNet-integrated; all backend traffic flows via private endpoints.
@description('Name prefix for resources')
param namePrefix string

@description('Azure region')
param location string

@description('Tags applied to every resource')
param tags object = {}

@description('Storage account name (single account for AzureWebJobsStorage + app data)')
param storageAccountName string

@description('Storage blob endpoint for Run repository')
param storageBlobEndpoint string

@description('Storage table endpoint for Run index')
param storageTableEndpoint string

@description('Microsoft Foundry AI Services endpoint')
param foundryEndpoint string

@description('Default Foundry deployment name')
param foundryDeploymentName string

@description('Subnet resource ID for Functions VNet integration')
param functionsSubnetId string

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${namePrefix}log'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${namePrefix}appi'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

resource flexPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${namePrefix}plan'
  location: location
  tags: tags
  sku: {
    name: 'FC1'
    tier: 'FlexConsumption'
  }
  properties: {
    reserved: true
  }
  kind: 'functionapp,linux'
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: '${namePrefix}func'
  location: location
  tags: union(tags, { 'azd-service-name': 'api' })
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: flexPlan.id
    httpsOnly: true
    virtualNetworkSubnetId: functionsSubnetId
    vnetRouteAllEnabled: true
    functionAppConfig: {
      runtime: {
        name: 'dotnet-isolated'
        version: '10.0'
      }
      scaleAndConcurrency: {
        instanceMemoryMB: 2048
        maximumInstanceCount: 40
      }
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${storage.properties.primaryEndpoints.blob}deploy'
          authentication: {
            type: 'SystemAssignedIdentity'
          }
        }
      }
    }
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage__blobServiceUri'
          value: storage.properties.primaryEndpoints.blob
        }
        {
          name: 'AzureWebJobsStorage__queueServiceUri'
          value: storage.properties.primaryEndpoints.queue
        }
        {
          name: 'AzureWebJobsStorage__tableServiceUri'
          value: storage.properties.primaryEndpoints.table
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'Storage__BlobEndpoint'
          value: storageBlobEndpoint
        }
        {
          name: 'Storage__TableEndpoint'
          value: storageTableEndpoint
        }
        {
          name: 'Foundry__Endpoint'
          value: foundryEndpoint
        }
        {
          name: 'Foundry__ModelDeploymentName'
          value: foundryDeploymentName
        }
        {
          name: 'Detection__DefaultLowThreshold'
          value: '0.55'
        }
        {
          name: 'Detection__DefaultHighThreshold'
          value: '0.85'
        }
      ]
      cors: {
        allowedOrigins: [
          '*'
        ]
      }
    }
  }
}

output functionAppName string = functionApp.name
output principalId string = functionApp.identity.principalId
output defaultHostName string = functionApp.properties.defaultHostName

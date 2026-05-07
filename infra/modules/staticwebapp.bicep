// Azure Static Web App linked to Function App backend
@description('Name prefix for resources')
param namePrefix string

@description('Azure region (Static Web App requires a SWA-supported region)')
param location string

@description('Tags applied to every resource')
param tags object = {}

@description('Function App resource id to link as backend')
param backendFunctionAppId string

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: '${namePrefix}stapp'
  location: location
  tags: union(tags, { 'azd-service-name': 'web' })
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    provider: 'None'
  }
}

resource swaBackend 'Microsoft.Web/staticSites/linkedBackends@2023-12-01' = {
  parent: staticWebApp
  name: 'backend'
  properties: {
    backendResourceId: backendFunctionAppId
    region: location
  }
}

output defaultHostname string = staticWebApp.properties.defaultHostname
output staticWebAppName string = staticWebApp.name

// Azure Storage account: blob container "runs" + table "RunIndex"
// Private endpoints for blob, table, and queue; public access denied.
@description('Name prefix for resources')
param namePrefix string

@description('Azure region')
param location string

@description('Tags applied to every resource')
param tags object = {}

@description('Subnet ID for private endpoints')
param privateEndpointSubnetId string

@description('Private DNS zone resource ID for blob')
param privateDnsZoneBlobId string

@description('Private DNS zone resource ID for table')
param privateDnsZoneTableId string

@description('Private DNS zone resource ID for queue')
param privateDnsZoneQueueId string

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: '${namePrefix}st'
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowSharedKeyAccess: false
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
    defaultToOAuthAuthentication: true
    publicNetworkAccess: 'Disabled'
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'None'
    }
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource runsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'runs'
  properties: {
    publicAccess: 'None'
  }
}

resource deployContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'deploy'
  properties: {
    publicAccess: 'None'
  }
}

resource tableService 'Microsoft.Storage/storageAccounts/tableServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource runIndexTable 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = {
  parent: tableService
  name: 'RunIndex'
}

resource userProfilesTable 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = {
  parent: tableService
  name: 'UserProfiles'
}

// --- Private endpoints ---

resource peBlobStorage 'Microsoft.Network/privateEndpoints@2024-01-01' = {
  name: '${namePrefix}pe-blob'
  location: location
  tags: tags
  properties: {
    subnet: { id: privateEndpointSubnetId }
    privateLinkServiceConnections: [
      {
        name: '${namePrefix}pe-blob'
        properties: {
          privateLinkServiceId: storage.id
          groupIds: [ 'blob' ]
        }
      }
    ]
  }
}

resource peBlobDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-01-01' = {
  parent: peBlobStorage
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'blob'
        properties: { privateDnsZoneId: privateDnsZoneBlobId }
      }
    ]
  }
}

resource peTableStorage 'Microsoft.Network/privateEndpoints@2024-01-01' = {
  name: '${namePrefix}pe-table'
  location: location
  tags: tags
  properties: {
    subnet: { id: privateEndpointSubnetId }
    privateLinkServiceConnections: [
      {
        name: '${namePrefix}pe-table'
        properties: {
          privateLinkServiceId: storage.id
          groupIds: [ 'table' ]
        }
      }
    ]
  }
}

resource peTableDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-01-01' = {
  parent: peTableStorage
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'table'
        properties: { privateDnsZoneId: privateDnsZoneTableId }
      }
    ]
  }
}

resource peQueueStorage 'Microsoft.Network/privateEndpoints@2024-01-01' = {
  name: '${namePrefix}pe-queue'
  location: location
  tags: tags
  properties: {
    subnet: { id: privateEndpointSubnetId }
    privateLinkServiceConnections: [
      {
        name: '${namePrefix}pe-queue'
        properties: {
          privateLinkServiceId: storage.id
          groupIds: [ 'queue' ]
        }
      }
    ]
  }
}

resource peQueueDnsGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2024-01-01' = {
  parent: peQueueStorage
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'queue'
        properties: { privateDnsZoneId: privateDnsZoneQueueId }
      }
    ]
  }
}

output storageAccountId string = storage.id
output storageAccountName string = storage.name
output blobEndpoint string = storage.properties.primaryEndpoints.blob
output tableEndpoint string = storage.properties.primaryEndpoints.table

// RBAC role assignments on Storage and Foundry for both the Functions MI
// and the deploying user (Constitution IV: signed-in user gets dev access).
@description('Storage account name')
param storageAccountName string

@description('Foundry / Azure OpenAI account name')
param foundryAccountName string

@description('Function App system-assigned MI principal ID')
param functionsPrincipalId string

@description('Deploying user (or admin) object ID')
param userPrincipalId string

var storageBlobDataContributor = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
var storageTableDataContributor = '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3'
var cognitiveServicesOpenAIUser = '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

resource foundry 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = {
  name: foundryAccountName
}

var assignments = [
  { scope: 'storage', principalId: functionsPrincipalId, role: storageBlobDataContributor, type: 'ServicePrincipal' }
  { scope: 'storage', principalId: functionsPrincipalId, role: storageTableDataContributor, type: 'ServicePrincipal' }
  { scope: 'foundry', principalId: functionsPrincipalId, role: cognitiveServicesOpenAIUser, type: 'ServicePrincipal' }
  { scope: 'storage', principalId: userPrincipalId, role: storageBlobDataContributor, type: 'User' }
  { scope: 'storage', principalId: userPrincipalId, role: storageTableDataContributor, type: 'User' }
  { scope: 'foundry', principalId: userPrincipalId, role: cognitiveServicesOpenAIUser, type: 'User' }
]

resource storageRoleAssignments 'Microsoft.Authorization/roleAssignments@2022-04-01' = [for (a, i) in assignments: if (a.scope == 'storage') {
  name: guid(storage.id, a.principalId, a.role)
  scope: storage
  properties: {
    principalId: a.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', a.role)
    principalType: a.type
  }
}]

resource foundryRoleAssignments 'Microsoft.Authorization/roleAssignments@2022-04-01' = [for (a, i) in assignments: if (a.scope == 'foundry') {
  name: guid(foundry.id, a.principalId, a.role)
  scope: foundry
  properties: {
    principalId: a.principalId
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', a.role)
    principalType: a.type
  }
}]

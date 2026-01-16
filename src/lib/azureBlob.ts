import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'campus-images'

let containerClient: ContainerClient | null = null

function getContainerClient(): ContainerClient {
    if (containerClient) return containerClient

    if (!accountName || !accountKey) {
        throw new Error('Azure Storage credentials not configured')
    }

    const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
    containerClient = blobServiceClient.getContainerClient(containerName)

    return containerClient
}

// Generate unique blob name
function generateBlobName(originalName: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const extension = originalName.split('.').pop() || 'jpg'
    return `${timestamp}-${random}.${extension}`
}

// Upload image to Azure Blob Storage
export async function uploadImage(
    file: Buffer,
    originalName: string,
    contentType: string = 'image/jpeg'
): Promise<string> {
    const container = getContainerClient()
    const blobName = generateBlobName(originalName)
    const blockBlobClient = container.getBlockBlobClient(blobName)

    await blockBlobClient.uploadData(file, {
        blobHTTPHeaders: {
            blobContentType: contentType
        }
    })

    return blockBlobClient.url
}

// Delete image from Azure Blob Storage
export async function deleteImage(imageUrl: string): Promise<boolean> {
    try {
        const container = getContainerClient()
        const blobName = imageUrl.split('/').pop()

        if (!blobName) return false

        const blockBlobClient = container.getBlockBlobClient(blobName)
        await blockBlobClient.delete()

        return true
    } catch (error) {
        console.error('Error deleting image:', error)
        return false
    }
}

// Get image URL (for cases where you need to construct URL manually)
export function getImageUrl(blobName: string): string {
    return `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}`
}

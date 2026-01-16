import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import prisma from '@/lib/db'
import Header from '@/components/Header'

interface PageProps {
    params: Promise<{ id: string }>
}

async function getPlace(id: string) {
    const place = await prisma.place.findUnique({
        where: { id, approvalStatus: 'APPROVED' },
        include: {
            category: true,
            block: { include: { campus: true } },
            floor: true,
            room: true,
            photos: true,
            createdBy: { select: { name: true } }
        }
    })
    return place
}

export default async function PlaceDetailPage({ params }: PageProps) {
    const { id } = await params
    const place = await getPlace(id)

    if (!place) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="pt-16">
                {/* Hero Image */}
                <div className="relative h-64 md:h-80 bg-gradient-to-br from-blue-100 to-indigo-100">
                    {place.photos && place.photos.length > 0 ? (
                        <Image
                            src={place.photos[0].photoUrl}
                            alt={place.name}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <span className="text-8xl">{place.category?.icon || '📍'}</span>
                        </div>
                    )}

                    {/* Back button */}
                    <Link
                        href="/map"
                        className="absolute top-4 left-4 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                    >
                        ←
                    </Link>
                </div>

                {/* Content */}
                <div className="max-w-2xl mx-auto px-4 -mt-8 relative">
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        {/* Category Badge */}
                        {place.category && (
                            <span className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
                                {place.category.icon} {place.category.categoryName}
                            </span>
                        )}

                        {/* Title */}
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                            {place.name}
                        </h1>

                        {/* Description */}
                        {place.description && (
                            <p className="text-gray-600 mb-6 leading-relaxed">
                                {place.description}
                            </p>
                        )}

                        {/* Location Details */}
                        <div className="bg-gray-50 rounded-xl p-4 mb-6">
                            <h2 className="font-semibold text-gray-900 mb-3">📍 Location</h2>
                            <div className="space-y-2 text-sm">
                                {place.block?.campus && (
                                    <p className="text-gray-600">
                                        <span className="font-medium">Campus:</span> {place.block.campus.name}
                                    </p>
                                )}
                                {place.block && (
                                    <p className="text-gray-600">
                                        <span className="font-medium">Block:</span> {place.block.name}
                                    </p>
                                )}
                                {place.floor && (
                                    <p className="text-gray-600">
                                        <span className="font-medium">Floor:</span> {place.floor.floorNumber === 0 ? 'Ground Floor' : `Floor ${place.floor.floorNumber}`}
                                    </p>
                                )}
                                {place.room && (
                                    <p className="text-gray-600">
                                        <span className="font-medium">Room:</span> {place.room.roomNumber}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Map Preview */}
                        {place.latitude && place.longitude && (
                            <div className="mb-6">
                                <h2 className="font-semibold text-gray-900 mb-3">🗺️ On Map</h2>
                                <div className="bg-gray-200 rounded-xl h-48 flex items-center justify-center">
                                    <a
                                        href={`https://www.google.com/maps?q=${place.latitude},${place.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                                    >
                                        Open in Google Maps
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Photo Gallery */}
                        {place.photos && place.photos.length > 1 && (
                            <div className="mb-6">
                                <h2 className="font-semibold text-gray-900 mb-3">📷 Photos</h2>
                                <div className="grid grid-cols-3 gap-2">
                                    {place.photos.map((photo: { photoUrl: string }, index: number) => (
                                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                                            <Image
                                                src={photo.photoUrl}
                                                alt={`${place.name} photo ${index + 1}`}
                                                fill
                                                className="object-cover hover:scale-110 transition-transform"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Added by */}
                        <div className="text-sm text-gray-400 border-t pt-4">
                            Added by {place.createdBy.name}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

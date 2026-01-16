'use client'

import Image from 'next/image'
import Link from 'next/link'

interface PlaceCardProps {
    id: string
    name: string
    description?: string | null
    category?: {
        categoryName: string
        icon?: string | null
    }
    block?: {
        name: string
    } | null
    floor?: {
        floorNumber: number
    } | null
    photos?: { photoUrl: string }[]
    compact?: boolean
    onClick?: () => void
}

export default function PlaceCard({
    id,
    name,
    description,
    category,
    block,
    floor,
    photos,
    compact = false,
    onClick
}: PlaceCardProps) {
    const cardContent = (
        <div
            className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${onClick ? 'cursor-pointer' : ''
                } ${compact ? 'flex items-center' : ''}`}
            onClick={onClick}
        >
            {/* Image */}
            <div className={`relative ${compact ? 'w-20 h-20 flex-shrink-0' : 'h-40 w-full'}`}>
                {photos && photos.length > 0 ? (
                    <Image
                        src={photos[0].photoUrl}
                        alt={name}
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                        <span className="text-4xl">{category?.icon || '📍'}</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className={`${compact ? 'p-3 flex-1' : 'p-4'}`}>
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-lg'} truncate`}>
                            {name}
                        </h3>

                        {!compact && description && (
                            <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                                {description}
                            </p>
                        )}
                    </div>

                    {!compact && category && (
                        <span className="flex-shrink-0 text-2xl" title={category.categoryName}>
                            {category.icon || '📍'}
                        </span>
                    )}
                </div>

                {/* Location info */}
                <div className={`flex flex-wrap gap-2 ${compact ? 'mt-1' : 'mt-3'}`}>
                    {category && (
                        <span className={`inline-flex items-center ${compact ? 'text-xs' : 'text-xs'} bg-blue-50 text-blue-700 px-2 py-1 rounded-full`}>
                            {category.categoryName}
                        </span>
                    )}

                    {block && (
                        <span className={`inline-flex items-center ${compact ? 'text-xs' : 'text-xs'} bg-gray-100 text-gray-600 px-2 py-1 rounded-full`}>
                            📍 {block.name}
                        </span>
                    )}

                    {floor && (
                        <span className={`inline-flex items-center ${compact ? 'text-xs' : 'text-xs'} bg-gray-100 text-gray-600 px-2 py-1 rounded-full`}>
                            🏢 Floor {floor.floorNumber}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )

    if (onClick) {
        return cardContent
    }

    return (
        <Link href={`/place/${id}`}>
            {cardContent}
        </Link>
    )
}

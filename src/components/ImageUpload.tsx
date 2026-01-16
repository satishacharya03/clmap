'use client'

import { useState, useRef, ChangeEvent } from 'react'
import Image from 'next/image'

interface ImageUploadProps {
    onImageSelect: (file: File) => void
    currentImage?: string | null
    className?: string
}

export default function ImageUpload({
    onImageSelect,
    currentImage,
    className = ''
}: ImageUploadProps) {
    const [preview, setPreview] = useState<string | null>(currentImage || null)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleFile(file)
        }
    }

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file')
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be less than 5MB')
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            setPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
        onImageSelect(file)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const file = e.dataTransfer.files?.[0]
        if (file) {
            handleFile(file)
        }
    }

    const handleClick = () => {
        fileInputRef.current?.click()
    }

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation()
        setPreview(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    return (
        <div className={className}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />

            <div
                onClick={handleClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
          relative w-full aspect-video rounded-xl border-2 border-dashed
          transition-all duration-200 cursor-pointer overflow-hidden
          ${isDragging
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                    }
        `}
            >
                {preview ? (
                    <>
                        <Image
                            src={preview}
                            alt="Preview"
                            fill
                            className="object-cover"
                        />
                        <button
                            onClick={handleRemove}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full
                         flex items-center justify-center hover:bg-red-600 transition-colors
                         shadow-lg"
                        >
                            ✕
                        </button>
                    </>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                        <div className="w-16 h-16 mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-sm text-gray-600 text-center">
                            <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 5MB</p>
                    </div>
                )}
            </div>
        </div>
    )
}

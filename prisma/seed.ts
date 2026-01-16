import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL!
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Chandigarh University Campus Center
const CU_CENTER = { lat: 30.7699, lng: 76.5766 }

async function main() {
    console.log('🌱 Starting seed for Chandigarh University...')

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12)
    const admin = await prisma.user.upsert({
        where: { email: 'admin@cu.edu.in' },
        update: {},
        create: {
            name: 'CU Admin',
            email: 'admin@cu.edu.in',
            password: adminPassword,
            role: 'ADMIN'
        }
    })
    console.log('✅ Admin user created:', admin.email)

    // Create test user
    const userPassword = await bcrypt.hash('user123', 12)
    const user = await prisma.user.upsert({
        where: { email: 'student@cu.edu.in' },
        update: {},
        create: {
            name: 'CU Student',
            email: 'student@cu.edu.in',
            password: userPassword,
            role: 'USER'
        }
    })
    console.log('✅ Test user created:', user.email)

    // Create place categories
    const categories = [
        { categoryName: 'Academic Block', icon: '🏫' },
        { categoryName: 'Department', icon: '🎓' },
        { categoryName: 'Classroom', icon: '📚' },
        { categoryName: 'Faculty Office', icon: '👨‍🏫' },
        { categoryName: 'Laboratory', icon: '🔬' },
        { categoryName: 'Library', icon: '📖' },
        { categoryName: 'Cafeteria', icon: '🍽️' },
        { categoryName: 'Parking', icon: '🅿️' },
        { categoryName: 'Sports Facility', icon: '⚽' },
        { categoryName: 'Auditorium', icon: '🎭' },
        { categoryName: 'Hostel', icon: '🏠' },
        { categoryName: 'Medical Center', icon: '🏥' },
        { categoryName: 'ATM', icon: '🏧' },
        { categoryName: 'Restroom', icon: '🚻' },
        { categoryName: 'Gate', icon: '🚪' },
        { categoryName: 'Other', icon: '📍' }
    ]

    for (const cat of categories) {
        await prisma.placeCategory.upsert({
            where: { categoryName: cat.categoryName },
            update: { icon: cat.icon },
            create: cat
        })
    }
    console.log('✅ Place categories created')

    // Create Chandigarh University Campus
    const campus = await prisma.campus.upsert({
        where: { id: 'chandigarh-university' },
        update: {},
        create: {
            id: 'chandigarh-university',
            name: 'Chandigarh University',
            latitude: CU_CENTER.lat,
            longitude: CU_CENTER.lng
        }
    })
    console.log('✅ Campus created:', campus.name)

    // Create blocks with actual CU locations
    const blocks = [
        { id: 'block-a', name: 'Block A - Engineering', latitude: 30.7705, longitude: 76.5755 },
        { id: 'block-b', name: 'Block B - Computer Science', latitude: 30.7698, longitude: 76.5770 },
        { id: 'block-c', name: 'Block C - Management', latitude: 30.7692, longitude: 76.5780 },
        { id: 'block-d', name: 'Block D - Sciences', latitude: 30.7688, longitude: 76.5760 },
        { id: 'admin-block', name: 'Administrative Block', latitude: 30.7710, longitude: 76.5765 },
        { id: 'library-block', name: 'Central Library Block', latitude: 30.7695, longitude: 76.5750 }
    ]

    for (const block of blocks) {
        await prisma.block.upsert({
            where: { id: block.id },
            update: {},
            create: {
                ...block,
                campusId: campus.id
            }
        })
    }
    console.log('✅ Blocks created')

    // Create floors
    const floors = [
        { id: 'block-a-floor-0', floorNumber: 0, blockId: 'block-a' },
        { id: 'block-a-floor-1', floorNumber: 1, blockId: 'block-a' },
        { id: 'block-a-floor-2', floorNumber: 2, blockId: 'block-a' },
        { id: 'block-b-floor-0', floorNumber: 0, blockId: 'block-b' },
        { id: 'block-b-floor-1', floorNumber: 1, blockId: 'block-b' },
        { id: 'block-b-floor-2', floorNumber: 2, blockId: 'block-b' }
    ]

    for (const floor of floors) {
        await prisma.floor.upsert({
            where: { id: floor.id },
            update: {},
            create: floor
        })
    }
    console.log('✅ Floors created')

    // Create parking areas
    const parkingAreas = [
        { id: 'main-parking', name: 'Main Parking', blockId: 'admin-block', latitude: 30.7715, longitude: 76.5760 },
        { id: 'hostel-parking', name: 'Hostel Parking', blockId: 'block-d', latitude: 30.7680, longitude: 76.5755 }
    ]

    for (const area of parkingAreas) {
        await prisma.parkingArea.upsert({
            where: { id: area.id },
            update: {},
            create: area
        })
    }

    // Create parking slots
    for (let i = 1; i <= 30; i++) {
        await prisma.parkingSlot.upsert({
            where: { id: `slot-${i}` },
            update: {},
            create: {
                id: `slot-${i}`,
                slotNumber: `P${i.toString().padStart(2, '0')}`,
                status: i <= 10 ? 'OCCUPIED' : 'AVAILABLE',
                parkingAreaId: i <= 20 ? 'main-parking' : 'hostel-parking'
            }
        })
    }
    console.log('✅ Parking areas and slots created')

    // Get category IDs
    const libraryCategory = await prisma.placeCategory.findFirst({ where: { categoryName: 'Library' } })
    const cafeteriaCategory = await prisma.placeCategory.findFirst({ where: { categoryName: 'Cafeteria' } })
    const gateCategory = await prisma.placeCategory.findFirst({ where: { categoryName: 'Gate' } })
    const sportsCategory = await prisma.placeCategory.findFirst({ where: { categoryName: 'Sports Facility' } })
    const hostelCategory = await prisma.placeCategory.findFirst({ where: { categoryName: 'Hostel' } })
    const labCategory = await prisma.placeCategory.findFirst({ where: { categoryName: 'Laboratory' } })
    const academicCategory = await prisma.placeCategory.findFirst({ where: { categoryName: 'Academic Block' } })

    // Create sample places around Chandigarh University
    const places = [
        {
            id: 'central-library',
            name: 'CU Central Library',
            description: 'Multi-storey central library with extensive book collection, digital resources, and quiet study areas',
            latitude: 30.7695,
            longitude: 76.5750,
            categoryId: libraryCategory?.id,
            blockId: 'library-block'
        },
        {
            id: 'main-cafeteria',
            name: 'Food Court',
            description: 'Main food court with multiple cuisines, fast food, and beverages',
            latitude: 30.7700,
            longitude: 76.5775,
            categoryId: cafeteriaCategory?.id
        },
        {
            id: 'main-gate',
            name: 'Main Gate (Gate 1)',
            description: 'Primary entrance to Chandigarh University campus',
            latitude: 30.7720,
            longitude: 76.5770,
            categoryId: gateCategory?.id
        },
        {
            id: 'sports-complex',
            name: 'Sports Complex',
            description: 'Multi-sport facility with gym, swimming pool, basketball courts, and cricket ground',
            latitude: 30.7685,
            longitude: 76.5800,
            categoryId: sportsCategory?.id
        },
        {
            id: 'boys-hostel-1',
            name: 'Boys Hostel Block 1',
            description: 'Residential accommodation for male students',
            latitude: 30.7675,
            longitude: 76.5745,
            categoryId: hostelCategory?.id
        },
        {
            id: 'girls-hostel-1',
            name: 'Girls Hostel Block 1',
            description: 'Residential accommodation for female students',
            latitude: 30.7678,
            longitude: 76.5790,
            categoryId: hostelCategory?.id
        },
        {
            id: 'cs-lab',
            name: 'Computer Science Lab',
            description: 'High-end computing facility with 200+ workstations',
            latitude: 30.7698,
            longitude: 76.5772,
            categoryId: labCategory?.id,
            blockId: 'block-b',
            floorId: 'block-b-floor-1'
        },
        {
            id: 'engineering-block',
            name: 'Engineering Block A',
            description: 'Main engineering building with lecture halls and faculty offices',
            latitude: 30.7705,
            longitude: 76.5755,
            categoryId: academicCategory?.id,
            blockId: 'block-a'
        }
    ]

    for (const place of places) {
        if (place.categoryId) {
            await prisma.place.upsert({
                where: { id: place.id },
                update: {},
                create: {
                    id: place.id,
                    name: place.name,
                    description: place.description,
                    latitude: place.latitude,
                    longitude: place.longitude,
                    categoryId: place.categoryId,
                    blockId: place.blockId || null,
                    floorId: place.floorId || null,
                    createdById: admin.id,
                    approvalStatus: 'APPROVED'
                }
            })
        }
    }
    console.log('✅ Sample places created')

    console.log('🎉 Seed completed for Chandigarh University!')
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

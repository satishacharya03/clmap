import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/auth'
import AdminClientLayout from './AdminClientLayout'

export default async function AdminServerLayout({ children }: { children: React.ReactNode }) {
    // Check database role against the current authenticated user
    const isUserAdmin = await isAdmin()
    
    // Protect the entire /admin/* routing tree
    if (!isUserAdmin) {
        redirect('/map') // Kick non-admins out to the app's main page
    }

    return <AdminClientLayout>{children}</AdminClientLayout>
}
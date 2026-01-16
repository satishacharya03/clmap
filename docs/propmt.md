# Smart Campus Navigation and Information Platform

## 1. Project Abstract

Large college campuses often present navigation challenges for students, faculty, and visitors due to complex layouts, multiple academic blocks, indoor rooms, and limited centralized digital information. Existing generic navigation systems such as Google Maps are not optimized for campus‑specific requirements like room‑level navigation, faculty offices, student‑contributed locations, or real‑time campus utilities.

This project proposes the design and development of a **Smart Campus Navigation and Information Platform**, a mobile‑first Progressive Web Application built using Next.js. The platform provides a custom‑designed campus map restricted to college boundaries and enables users to locate academic blocks, departments, classrooms, faculty offices, cafeterias, parking areas, and other important locations. Users can explore categorized places, view detailed information including images, and receive directions within the campus.

A community‑driven contribution model allows authenticated users to add new places, which are reviewed and approved by administrators before becoming publicly visible. The system also incorporates advanced features such as time‑limited live location sharing within the campus and real‑time parking availability monitoring (implemented using simulated or manually updated data).

The application uses **PostgreSQL (Neon DB)** for structured relational data, **Azure Blob Storage** for storing images and heavy media, and a real‑time backend service for live updates. The proposed system improves campus accessibility, reduces navigation friction, and demonstrates real‑world full‑stack system design suitable for academic evaluation.

---

## 2. System Actors

* **User (Student / Faculty / Visitor)**

  * View campus map and places
  * Search and filter locations
  * Add new places
  * Share live location

* **Admin**

  * Approve or reject submitted places
  * Manage campus structure
  * Update parking availability

---

## 3. Entity Relationship (ER) Design

### Core Entities

* **User** (user_id, name, email, role)
* **Role** (role_id, role_name)
* **Campus** (campus_id, name)
* **Block** (block_id, campus_id, name)
* **Floor** (floor_id, block_id, floor_number)
* **Room** (room_id, floor_id, room_number, room_type)
* **Place** (place_id, name, description, category_id, block_id, floor_id, room_id, created_by, approval_status)
* **PlaceCategory** (category_id, category_name)
* **PlacePhoto** (photo_id, place_id, photo_url)
* **Approval** (approval_id, place_id, admin_id, status, reviewed_at)
* **ParkingArea** (parking_area_id, name, block_id)
* **ParkingSlot** (slot_id, parking_area_id, status)

### Relationships

* One Campus has many Blocks
* One Block has many Floors
* One Floor has many Rooms
* One User can create many Places
* One Place belongs to one Category
* One Place can have many Photos
* One Place requires one Approval
* One ParkingArea has many ParkingSlots

---

## 4. Functional Requirements

### Core Functionalities

* User authentication and authorization
* Campus map visualization
* Place discovery with categories
* Place details with images and directions
* User‑submitted place addition
* Admin approval workflow

### Advanced Functionalities

* Live location sharing (time‑limited)
* Parking slot availability (real‑time or simulated)

---

## 5. Non‑Functional Requirements

* Mobile‑first responsive design
* Secure authentication
* Scalable cloud storage
* Fast read operations for map data

---

## 6. API Design (Next.js App Router)

### Authentication

* POST /api/auth/login
* POST /api/auth/register

### Places

* GET /api/places
* GET /api/places/[id]
* POST /api/places (user submission)
* PUT /api/places/[id] (admin)

### Categories

* GET /api/categories

### Approvals

* GET /api/admin/approvals
* POST /api/admin/approvals/[placeId]

### Parking

* GET /api/parking
* POST /api/admin/parking/update

### Live Location

* POST /api/location/share
* GET /api/location/active

---

## 7. Next.js Folder Structure

```
/app
  /(auth)
    login/page.tsx
    register/page.tsx

  /(dashboard)
    map/page.tsx
    place/[id]/page.tsx
    add-place/page.tsx
    parking/page.tsx

  /(admin)
    approvals/page.tsx
    parking/page.tsx

  /api
    auth/
      login/route.ts
      register/route.ts
    places/
      route.ts
      [id]/route.ts
    categories/route.ts
    admin/
      approvals/[placeId]/route.ts
      parking/update/route.ts
    location/
      share/route.ts
      active/route.ts

/lib
  db.ts
  auth.ts
  azureBlob.ts

/models
  user.ts
  place.ts
  parking.ts

/components
  MapView.tsx
  PlaceCard.tsx
  ImageUpload.tsx

/utils
  constants.ts
  validators.ts
```

---

## 8. External Services

* **Neon DB (PostgreSQL)** – relational data
* **Azure Blob Storage** – image storage
* **Realtime Service (Firebase/Supabase)** – live location & parking updates

---

## 9. Deployment

* Frontend & API: Vercel
* Database: Neon DB
* Media Storage: Azure Blob Storage

---

## 10. Future Enhancements

* Indoor navigation using QR codes
* AR‑based navigation
* Emergency alert system
* Accessibility‑optimized routes

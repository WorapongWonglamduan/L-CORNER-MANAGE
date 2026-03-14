# Image Upload System Design

## Overview
ระบบจัดการรูปภาพสำหรับ L-Corner POS ที่รองรับการอัพโหลด, จัดเก็บ, และแสดงผลรูปภาพอย่างมีประสิทธิภาพ

## Database Schema

### Media Table (ตารางกลางสำหรับจัดเก็บรูปภาพ)

```prisma
model Media {
  id              String   @id @default(uuid())
  
  // File information
  filename        String   // Original filename
  stored_filename String   @unique // UUID-based filename in storage
  file_path       String   // Relative path: /uploads/2026/03/xxx.jpg
  file_size       Int      // Size in bytes
  mime_type       String   // image/jpeg, image/png, etc.
  
  // Image metadata
  width           Int?
  height          Int?
  alt_text        String?  @db.Text
  
  // Thumbnails
  thumbnail_path  String?  // Path to thumbnail
  medium_path     String?  // Path to medium size
  
  // Usage tracking
  entity_type     String?  // "product", "category", "user", etc.
  entity_id       String?  // ID of the related entity
  
  // Organization
  folder          String   @default("general") // Category folder
  is_public       Boolean  @default(true)
  
  // Audit
  uploaded_by     String?
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  
  // Relations
  product_images  ProductMedia[]
  
  @@index([entity_type, entity_id])
  @@index([created_at])
  @@map("media")
}
```

### ProductMedia (Many-to-Many Relationship)

```prisma
model ProductMedia {
  id          String   @id @default(uuid())
  product_id  String
  media_id    String
  is_primary  Boolean  @default(false) // รูปหลัก
  sort_order  Int      @default(0)
  created_at  DateTime @default(now())
  
  product Product @relation(fields: [product_id], references: [id], onDelete: Cascade)
  media   Media   @relation(fields: [media_id], references: [id], onDelete: Cascade)
  
  @@unique([product_id, media_id])
  @@index([product_id, is_primary])
  @@map("product_media")
}
```

### Update Product Model

```prisma
model Product {
  // ... existing fields
  
  // Remove: image_url String?
  // Add:
  media ProductMedia[]
}
```

## File Storage Structure

```
/uploads/
  ├── 2026/
  │   ├── 01/
  │   ├── 02/
  │   └── 03/
  │       ├── original/
  │       │   └── uuid-filename.jpg
  │       ├── thumbnail/
  │       │   └── uuid-filename.jpg (150x150)
  │       └── medium/
  │           └── uuid-filename.jpg (500x500)
  ├── products/
  ├── categories/
  └── temp/ (for temporary uploads)
```

## Image Processing

### Sizes
- **Original**: ไม่เกิน 2MB, max 2000x2000px
- **Medium**: 800x800px (for product detail)
- **Thumbnail**: 200x200px (for lists)
- **Small**: 100x100px (for icons)

### Formats Supported
- JPEG/JPG
- PNG
- WebP (recommended for better compression)
- GIF (for animations)

### Optimization
- Compress images on upload
- Convert to WebP when possible
- Generate responsive sizes automatically
- Lazy loading on frontend

## API Endpoints

### Upload Image
```
POST /api/media/upload
Content-Type: multipart/form-data

Body:
- file: File
- entity_type?: string
- entity_id?: string
- folder?: string
- alt_text?: string

Response:
{
  id: string
  file_path: string
  thumbnail_path: string
  medium_path: string
  url: string
}
```

### Get Image
```
GET /api/media/:id
GET /uploads/2026/03/original/uuid.jpg
```

### Delete Image
```
DELETE /api/media/:id
```

### Attach to Product
```
POST /api/products/:productId/media
Body:
{
  media_id: string
  is_primary: boolean
  sort_order: number
}
```

## Security Considerations

1. **File Validation**
   - Check file type (MIME type)
   - Validate file size
   - Scan for malware (optional)
   - Sanitize filename

2. **Access Control**
   - Authenticate upload requests
   - Check user permissions
   - Rate limiting

3. **Storage**
   - Store outside public folder for sensitive images
   - Use signed URLs for private images
   - Implement CDN for public images

## Usage Examples

### Upload Product Image
```typescript
const formData = new FormData()
formData.append('file', imageFile)
formData.append('entity_type', 'product')
formData.append('entity_id', productId)
formData.append('folder', 'products')

const response = await fetch('/api/media/upload', {
  method: 'POST',
  body: formData
})

const media = await response.json()

// Attach to product
await fetch(`/api/products/${productId}/media`, {
  method: 'POST',
  body: JSON.stringify({
    media_id: media.id,
    is_primary: true,
    sort_order: 0
  })
})
```

### Display Product Images
```typescript
// Get product with images
const product = await prisma.product.findUnique({
  where: { id: productId },
  include: {
    media: {
      include: { media: true },
      orderBy: { sort_order: 'asc' }
    }
  }
})

// Primary image
const primaryImage = product.media.find(pm => pm.is_primary)?.media

// All images
const images = product.media.map(pm => pm.media)
```

## Migration Strategy

### Phase 1: Add New Tables
1. Create Media table
2. Create ProductMedia table
3. Keep existing image_url field

### Phase 2: Migrate Existing Data
1. Copy existing image_url to Media table
2. Create ProductMedia records
3. Update references

### Phase 3: Cleanup
1. Remove image_url field from Product
2. Update all queries to use media relation

## Performance Optimization

1. **Caching**
   - Cache image URLs
   - Use CDN for static assets
   - Browser caching headers

2. **Database**
   - Index on entity_type + entity_id
   - Index on product_id + is_primary
   - Eager load media with products

3. **Storage**
   - Use separate disk/volume for uploads
   - Implement cleanup job for unused images
   - Archive old images

## Backup Strategy

1. Regular backup of /uploads folder
2. Database backup includes media metadata
3. Sync to cloud storage (optional)
4. Keep backup for 30 days

## Future Enhancements

1. **Image Editing**
   - Crop, resize, rotate
   - Filters and effects
   - Watermark

2. **Advanced Features**
   - Image gallery
   - Drag & drop upload
   - Bulk upload
   - Image search by content

3. **Integration**
   - Cloud storage (S3, Google Cloud Storage)
   - CDN integration
   - Image optimization service

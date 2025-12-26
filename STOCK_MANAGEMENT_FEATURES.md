# Stock Management Features

## ✅ Completed Features

### 1. **Record Stock Entry** (`/dashboard/stock/entry`)
Complete form for recording new stock entries with:

#### Required Fields:
- **Product Selection**: Dropdown with search of all active products
- **Warehouse Selection**: Choose destination warehouse
- **Quantity Received**: Number input with unit type display
- **Entry Date**: Date picker (defaults to today)

#### Optional Fields:
- **Expiry Date**: Automatically shown for products with `hasExpiryDate: true`
- **Entry Photo**: Image upload with preview and compression
  - Max size: 5MB
  - Formats: JPG, PNG
  - Base64 encoding for storage
- **Purchase Price**: Track cost per unit
- **Supplier Invoice**: Reference number for tracking

#### Features:
- Real-time product info display (SKU, unit type)
- Conditional expiry date field
- Photo preview before submission
- Form validation with error messages
- Success toast and redirect

### 2. **Record Stock Exit** (`/dashboard/stock/exit`) ✨ NEW
Complete form for recording stock dispatch/sales with:

#### Required Fields:
- **Product Selection**: Choose product to dispatch
- **Warehouse Selection**: Select source warehouse
- **Batch Selection**: Choose specific batch (shows available quantity and age)
  - Displays: Batch ID, Available quantity, Age in days
  - Filtered by product and warehouse
  - Only shows batches with available stock
- **Quantity**: Amount to dispatch (validated against available)
- **Exit Date**: Date picker (defaults to today)

#### Optional Fields:
- **Customer Name**: Track who received the stock
- **Order Reference**: Link to order/invoice number
- **Exit Photo**: Image upload for verification
  - Max size: 5MB
  - Formats: JPG, PNG
  - Base64 encoding

#### Features:
- FIFO recommendation (oldest batch first)
- Real-time available quantity display
- Batch status indicators (healthy/at_risk/dead)
- Quantity validation against available stock
- Photo upload with preview
- Creates stock movement record
- Updates stock quantity automatically

### 3. **View Stock Entries** (`/dashboard/stock`)
Comprehensive stock listing with:

#### Display Information:
- Product name and SKU
- Batch ID (unique identifier)
- Warehouse location
- Quantity (Available / Received)
- Damaged quantity (if any)
- Entry date and expiry date
- Age in days
- Status badge (Healthy / At Risk / Dead Stock)
- Entry photo thumbnail
- Created by user name

#### Actions:
- **Record Entry** button (green) - Add new stock
- **Record Exit** button (red) - Dispatch stock

#### Filters:
- **Product Filter**: Show stock for specific product
- **Warehouse Filter**: Show stock in specific warehouse
- **Clear Filters**: Reset all filters

#### Features:
- Card-based layout for better readability
- Photo modal for full-size view
- Empty state with CTA
- Real-time filtering
- Responsive design

### 4. **Batch Tracking**
Every stock entry automatically gets:
- **Unique Batch ID**: Format `{SKU}-{timestamp}`
- **Entry Tracking**: Who created, when created
- **Photo Evidence**: Visual verification of received stock
- **Quantity Tracking**: Received vs Available vs Damaged
- **Age Tracking**: Auto-calculated days since entry
- **Status Updates**: Healthy → At Risk → Dead Stock

### 5. **Stock Movement Tracking**
Every exit creates a movement record with:
- **Movement Type**: "out" for exits
- **Quantity**: Amount dispatched
- **Reason**: Auto-generated from customer/order info
- **Photos**: Exit verification photos
- **Timestamp**: When the movement occurred
- **Performed By**: User who recorded the exit

### 6. **Photo Management**
- Upload photos during entry and exit
- Store as base64 in database
- Display thumbnails in stock list
- Click to view full-size in modal
- Track who uploaded and when

## API Endpoints

### Stock Entry API (`/api/stock/entry`)

#### POST - Create Stock Entry
```typescript
{
  productId: string (required)
  warehouseId: string (required)
  quantity: number (required)
  entryDate: string (required)
  expiryDate?: string
  entryPhoto?: string (base64)
  purchasePrice?: number
  supplierInvoice?: string
}
```

**Response:**
```typescript
{
  success: true
  message: "Stock entry recorded successfully"
  stock: {
    _id: string
    batchId: string
    quantity: number
    product: { _id, name, sku }
    warehouse: { _id, name }
  }
}
```

#### GET - List Stock Entries
**Query Params:**
- `productId`: Filter by product
- `warehouseId`: Filter by warehouse

**Response:**
```typescript
{
  success: true
  stocks: StockEntry[]
  total: number
}
```

### Stock Exit API (`/api/stock/exit`) ✨ NEW

#### POST - Record Stock Exit
```typescript
{
  stockId: string (required)
  productId: string (required)
  warehouseId: string (required)
  quantity: number (required)
  exitDate?: string
  customerName?: string
  orderReference?: string
  exitPhoto?: string (base64)
}
```

**Validations:**
- Quantity must not exceed available stock
- Product and warehouse must match the stock batch
- Stock batch must exist and belong to company

**Response:**
```typescript
{
  success: true
  message: "Stock exit recorded successfully"
  stockExit: {
    _id: string
    batchId: string
    quantity: number
    remainingQuantity: number
    product: { _id, name, sku }
    warehouse: { _id, name }
    customerName?: string
    orderReference?: string
  }
}
```

#### GET - List Stock Movements
**Query Params:**
- `productId`: Filter by product
- `warehouseId`: Filter by warehouse
- `type`: Filter by movement type (in/out/transfer/damage/adjustment)

**Response:**
```typescript
{
  success: true
  movements: StockMovement[]
  total: number
}
```

## Database Schema

### Stock Model (Updated)
```typescript
{
  companyId: ObjectId (required) ✅
  productId: ObjectId (required)
  warehouseId: ObjectId (required)
  createdBy: ObjectId (required)
  batchId: string (required, unique)
  quantityReceived: number (required)
  quantityAvailable: number (required)
  quantityDamaged: number (default: 0)
  entryDate: Date (required)
  expiryDate: Date | null
  ageInDays: number (auto-calculated)
  status: "healthy" | "at_risk" | "dead"
  entryPhotos: [{
    url: string
    uploadedBy: ObjectId
    timestamp: Date
  }]
}
```

## User Flow

### Recording Stock Entry:
1. Navigate to Stock → Record Stock Entry
2. Select product from dropdown
3. Select warehouse
4. Enter quantity received
5. Set entry date (defaults to today)
6. (Optional) Add expiry date if product requires it
7. (Optional) Upload entry photo
8. (Optional) Add purchase price and invoice number
9. Click "Record Stock Entry"
10. Success → Redirected to stock list

### Viewing Stock:
1. Navigate to Stock from sidebar
2. See all stock entries in card format
3. Filter by product or warehouse
4. Click photo thumbnail to view full size
5. See batch tracking and aging information

## Key Features

### ✅ Batch Tracking
- Every entry gets unique batch ID
- Format: `{ProductSKU}-{Timestamp}`
- Enables FIFO/LIFO tracking
- Individual batch aging

### ✅ Photo Verification
- Upload photos during entry
- Base64 storage (no external service needed)
- Thumbnail + full-size view
- Track who uploaded and when

### ✅ Aging Tracking
- Auto-calculates age in days
- Status updates (healthy/at_risk/dead)
- Based on entry date
- Visual status badges

### ✅ Quantity Management
- Track received quantity
- Track available quantity
- Track damaged quantity
- Unit type display

### ✅ Company Isolation
- All stock entries scoped to company
- Users only see their company's stock
- Automatic companyId assignment

## Navigation

- **Sidebar**: Stock link (between Inventory and Warehouses)
- **Stock Page**: "Record Stock Entry" button
- **Quick Actions**: Can add "Record Stock" shortcut

## Integration Points

### With Products:
- Select from active products only
- Display product SKU and unit type
- Conditional expiry date field

### With Warehouses:
- Select from active warehouses
- Display warehouse location
- Filter stock by warehouse

### With Users:
- Track who created entry
- Display creator name
- Link to user profile (future)

## Future Enhancements

- Stock OUT (dispatch/sale)
- Stock transfer between warehouses
- Bulk stock entry (CSV import)
- Barcode scanning
- Stock adjustment/correction
- Low stock alerts
- Expiry alerts
- Stock valuation reports
- FIFO/LIFO cost calculation

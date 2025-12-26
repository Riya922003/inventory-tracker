# Warehouse Management System

## Overview

Complete warehouse management system with real-time metrics, stock tracking, and performance monitoring.

## Features Implemented

### 1. Warehouses List Page (`/dashboard/warehouses`)

**Main Features:**
- Grid view of all warehouses with comprehensive metrics
- Real-time utilization tracking
- Health status monitoring
- Quick action buttons

**Metrics Displayed Per Warehouse:**
- **Product Count**: Number of unique products stored
- **Total Value**: Combined value of all stock (₹)
- **Utilization**: Percentage of capacity used with visual progress bar
- **Manager**: Assigned warehouse manager (or "Not assigned")
- **Health Status**: Count of healthy, at-risk, and dead stock
- **Last Activity**: Most recent stock movement date
- **Weekly Movements**: Number of stock movements in the last 7 days

**Utilization Status:**
- 🟢 **Active** (0-69%): Normal operations
- 🟠 **High Occupancy** (70-89%): Approaching capacity
- 🔴 **Critical Capacity** (90-100%): Urgent attention needed

**Quick Actions:**
- View Details
- Edit
- Transfer Stock / Assign Manager

### 2. Add Warehouse Page (`/dashboard/warehouses/new`)

**Form Fields:**
- **Warehouse Name** (required): Unique identifier
- **Address**:
  - Street Address (optional)
  - City (required)
  - State (required)
  - PIN Code (optional)
  - Country (default: India)
- **Manager** (optional): Select from company users
- **Capacity** (required): Maximum storage units (default: 1000)

**Validations:**
- Unique warehouse name per company
- Manager must belong to the same company
- Minimum capacity: 1 unit

### 3. Edit Warehouse Page (`/dashboard/warehouses/[id]/edit`)

**Features:**
- Pre-filled form with existing data
- Same validations as create
- Can change manager or set to "Not assigned"
- Can update capacity

**Restrictions:**
- Cannot use duplicate warehouse name
- Manager must be valid company user

### 4. Warehouse Detail Page (`/dashboard/warehouses/[id]`)

**Header:**
- Warehouse name with icon
- Location (city, state)
- Edit button
- More menu (•••) with Delete option

**Overview Section (4 Metrics):**
- **Products**: Total unique products
- **Total Value**: Combined inventory value
- **Capacity**: Maximum storage units
- **Occupancy**: Percentage with progress bar

**Warehouse Details Card:**
- 📍 **Address**: Full address with street, city, state, PIN, country
- 👤 **Warehouse Manager**: Name, email, phone (or "Not assigned")
- 📊 **Storage Information**: Capacity, current stock, available space
- 📅 **Timeline**: Created date, last updated date

**Inventory at This Location:**
- Header with item count
- "Add Stock" and "Transfer" buttons
- Table with columns:
  - Product Name
  - SKU
  - Qty (with unit type)
  - Age (in days)
  - Status (✅ Good / ⚠️ At Risk / ❌ Dead)
  - Value
- Empty state with call-to-action

**Recent Activity Section:**
- Last 5 stock movements
- Movement icon (📦 in, 📤 out, 🔄 transfer)
- Description with quantity and product
- Timestamp and performer name
- Hover effect on activity cards

**Performance Metrics (Last 30 Days):**
- 📦 **Stock Received**: Total units received
- 📤 **Stock Dispatched**: Total units sent out
- 🔄 **Stock Movements**: Total movement count
- ⏱️ **Avg Fulfillment Time**: Average time to fulfill orders
- 📊 **Inventory Turnover**: Turnover ratio calculation

**Delete Functionality:**
- Confirmation modal
- Prevents deletion if warehouse has active stock
- Soft delete (sets `isActive: false`)

## API Endpoints

### GET `/api/warehouses`
**Purpose**: List all warehouses with metrics

**Response:**
```typescript
{
  success: true,
  warehouses: [
    {
      _id: string,
      name: string,
      address: {
        street?: string,
        city: string,
        state: string,
        pin?: string,
        country: string
      },
      manager?: {
        _id: string,
        name: string,
        email: string
      },
      capacity: number,
      metrics: {
        productCount: number,
        totalValue: number,
        totalQuantity: number,
        utilization: number,
        atRiskCount: number,
        deadCount: number,
        lastActivity: Date,
        weeklyMovements: number
      }
    }
  ]
}
```

**Metrics Calculation:**
- `productCount`: Unique products in warehouse
- `totalValue`: Sum of (quantity × unitPrice) for all stock
- `totalQuantity`: Sum of all quantityAvailable
- `utilization`: (totalQuantity / capacity) × 100
- `atRiskCount`: Stock with status "at_risk"
- `deadCount`: Stock with status "dead"
- `lastActivity`: Most recent StockMovement timestamp
- `weeklyMovements`: StockMovements in last 7 days

### POST `/api/warehouses`
**Purpose**: Create new warehouse

**Request Body:**
```typescript
{
  name: string,
  address: {
    street?: string,
    city: string,
    state: string,
    pin?: string,
    country?: string
  },
  manager?: string, // User ID
  capacity?: number // Default: 1000
}
```

**Validations:**
- Name, city, and state are required
- Warehouse name must be unique per company
- Manager must exist and belong to company
- Capacity must be positive number

### GET `/api/warehouses/[id]`
**Purpose**: Get single warehouse details

**Response:**
```typescript
{
  success: true,
  warehouse: {
    _id: string,
    name: string,
    address: Address,
    manager?: {
      _id: string,
      name: string,
      email: string
    },
    capacity: number,
    createdAt: Date
  }
}
```

### PUT `/api/warehouses/[id]`
**Purpose**: Update warehouse

**Request Body:**
```typescript
{
  name?: string,
  address?: Address,
  manager?: string | null,
  capacity?: number
}
```

**Validations:**
- If changing name, new name must be unique
- If changing manager, must be valid company user
- Can set manager to null to unassign

### DELETE `/api/warehouses/[id]`
**Purpose**: Archive warehouse (soft delete)

**Restrictions:**
- Cannot delete warehouse with active stock (quantityAvailable > 0)
- Must transfer or remove all stock first

**Response:**
```typescript
{
  success: true,
  message: "Warehouse archived successfully"
}
```

### GET `/api/users`
**Purpose**: Get all users in company (for manager dropdown)

**Response:**
```typescript
{
  success: true,
  users: [
    {
      _id: string,
      name: string,
      email: string
    }
  ]
}
```

## Database Schema

### Warehouse Model
```typescript
{
  companyId: ObjectId (ref: SystemConfig) - required
  name: string - required
  address: {
    street?: string
    city: string - required
    state: string - required
    pin?: string
    country: string - default: "India"
  }
  manager?: ObjectId (ref: User)
  capacity?: number - default: 1000
  isActive: boolean - default: true
  createdAt: Date
  updatedAt: Date
}
```

**Indexes:**
- `companyId`: For company isolation
- `manager`: For manager queries

## Business Logic

### Utilization Calculation
```typescript
utilization = Math.min(
  Math.round((totalQuantity / capacity) * 100),
  100
)
```

### Value Formatting
- < ₹1,000: Show exact amount
- ₹1,000 - ₹99,999: Show in K (e.g., ₹45.2K)
- ₹1L - ₹99.99L: Show in Lakhs (e.g., ₹18.5L)
- ≥ ₹1Cr: Show in Crores (e.g., ₹2.3Cr)

### Status Colors
- **Green** (0-49%): Healthy utilization
- **Yellow** (50-69%): Moderate utilization
- **Orange** (70-89%): High occupancy
- **Red** (90-100%): Critical capacity

### Stock Health
- **Healthy**: Age < 60 days
- **At Risk**: Age 60-89 days
- **Dead**: Age ≥ 90 days

## User Experience

### Empty State
When no warehouses exist:
- Large warehouse icon
- "No warehouses yet" message
- "Add your first warehouse" call-to-action
- Direct button to create warehouse

### Loading States
- "Loading warehouses..." on list page
- "Loading warehouse details..." on detail page
- "Loading warehouse..." on edit page

### Success Messages
- "Warehouse created successfully!"
- "Warehouse updated successfully!"
- "Warehouse deleted successfully!"

### Error Messages
- "A warehouse with this name already exists"
- "Invalid manager selected"
- "Cannot delete warehouse with active stock"
- "Failed to load warehouses"

### Delete Confirmation
Modal with:
- Warning message
- Explanation of restrictions
- Cancel and Delete buttons
- Disabled state during deletion

## Integration Points

### With Stock Management
- Stock entries reference warehouseId
- Stock exits reference warehouseId
- Utilization calculated from stock quantities
- Health metrics from stock status

### With User Management
- Managers selected from company users
- Manager info displayed with warehouse
- User can manage multiple warehouses

### With Dashboard
- Warehouse metrics feed into dashboard
- Per-warehouse breakdown shown
- Alerts generated per warehouse

### With Alerts
- Alerts reference warehouseId
- Warehouse-specific alert filtering
- Alert counts shown in warehouse metrics

## Navigation

**Sidebar Link:**
- Icon: 🏢 Warehouse
- Path: `/dashboard/warehouses`
- Always visible

**Breadcrumb Flow:**
1. Warehouses → List page
2. Warehouses → Add Warehouse
3. Warehouses → [Name] → Detail page
4. Warehouses → [Name] → Edit

## Performance Optimizations

### List Page
- Single query for all warehouses
- Parallel queries for metrics calculation
- Lean queries (no full document hydration)
- Indexed queries on companyId

### Detail Page
- Parallel fetching of warehouse and stock data
- Efficient aggregation for metrics
- Cached calculations

### Metrics Calculation
- In-memory calculations (no extra DB queries)
- Efficient array operations
- Set for unique product counting

## Future Enhancements

### Planned Features
- [ ] Stock transfer between warehouses
- [ ] Warehouse capacity alerts
- [ ] Historical utilization charts
- [ ] Warehouse performance reports
- [ ] Bulk warehouse import
- [ ] Warehouse zones/sections
- [ ] Temperature/humidity tracking
- [ ] Warehouse photos
- [ ] QR code generation
- [ ] Mobile warehouse app

### Advanced Features
- [ ] Multi-location routing
- [ ] Warehouse optimization suggestions
- [ ] Predictive capacity planning
- [ ] Integration with shipping providers
- [ ] Real-time stock tracking
- [ ] Automated reordering by warehouse
- [ ] Warehouse cost tracking
- [ ] Staff assignment and scheduling

## Security

### Access Control
- All endpoints require authentication
- Company isolation via companyId
- Users can only see their company's warehouses
- Manager assignment restricted to company users

### Data Validation
- Input sanitization
- Type checking
- Required field validation
- Unique constraint enforcement

### Soft Delete
- Warehouses never permanently deleted
- Can be reactivated if needed
- Historical data preserved

## Testing Checklist

- [ ] Create warehouse with all fields
- [ ] Create warehouse with minimal fields
- [ ] Edit warehouse name
- [ ] Assign manager to warehouse
- [ ] Remove manager from warehouse
- [ ] Update warehouse capacity
- [ ] View warehouse with no stock
- [ ] View warehouse with stock
- [ ] Delete empty warehouse
- [ ] Try to delete warehouse with stock
- [ ] Check utilization calculation
- [ ] Verify health status counts
- [ ] Test weekly movements calculation
- [ ] Verify value formatting
- [ ] Check duplicate name validation
- [ ] Test invalid manager assignment

---

**The warehouse management system provides comprehensive visibility and control over storage locations, enabling efficient inventory distribution and capacity planning.**

import {
    LayoutGrid,
    ClipboardList,
    Users,
    Package,
    Banknote,
    BarChart3,
    UserCog,
    ShieldCheck,
    Settings,
    Truck,
    CheckSquare,
    MessageSquare,
} from "lucide-react"

// ============================================================
// TYPES
// ============================================================
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type JobCardStatus = 'ENQUIRY' | 'SALES' | 'ADMIN' | 'DESIGN' | 'STORE' | 'PRODUCTION' | 'QC' | 'DISPATCH' | 'ACCOUNTS' | 'CLOSED';
export type UserRole = 'ADMIN' | 'SALES' | 'DESIGN' | 'STORE' | 'PRODUCTION' | 'QC' | 'DISPATCH' | 'ACCOUNTANT' | 'CLIENT';

export interface User {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: UserRole;
    status: 'ACTIVE' | 'INACTIVE';
    phone?: string;
    joinedAt?: string;
}

export interface Client {
    id: string;
    name: string;
    email: string;
    phone: string;
    gstNumber: string;
    gstVerified: boolean;
    address: string;
    city: string;
    totalOrders: number;
    totalValue: number;
    avatar?: string;
    createdAt: string;
}

export interface JobCard {
    id: string;
    jobNumber: string;
    clientId: string;
    clientName: string;
    status: JobCardStatus;
    priority: Priority;
    createdAt: string;
    updatedAt: string;
    deadline: string;
    description: string;
    items: string;
    estimatedValue: number;
    assignedTo: string[];
    whatsappGroupCreated: boolean;
    currentStage: string;
    daysInCurrentStage: number;
    completionPercent: number;
}

export interface Invoice {
    id: string;
    invoiceNumber: string;
    jobCardId: string;
    clientName: string;
    amount: number;
    gstAmount: number;
    status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';
    dueDate: string;
    createdAt: string;
    paymentMode?: string;
}

export interface Quotation {
    id: string;
    quotationNumber: string;
    jobCardId: string;
    clientName: string;
    amount: number;
    status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';
    createdAt: string;
    validUntil: string;
}

export interface InventoryItem {
    id: string;
    name: string;
    category: string;
    stockLevel: number;
    unit: string;
    lowStockThreshold: number;
    unitPrice: number;
    supplier: string;
    lastRestocked: string;
}

export interface PurchaseOrder {
    id: string;
    poNumber: string;
    supplier: string;
    items: string;
    totalAmount: number;
    status: 'PENDING' | 'APPROVED' | 'DELIVERED' | 'CANCELLED';
    raisedBy: string;
    expectedDate: string;
    createdAt: string;
}

export interface WhatsAppLogEntry {
    id: string;
    message: string;
    recipient: string;
    jobNumber?: string;
    time: string;
    status: 'delivered' | 'read' | 'pending';
}

export interface ActivityEntry {
    id: string;
    jobNumber: string;
    action: string;
    actor: string;
    actorRole: UserRole;
    timestamp: string;
    details?: string;
}

export interface DeliveryEntry {
    id: string;
    jobNumber: string;
    clientName: string;
    address: string;
    city: string;
    date: string;
    timeSlot: string;
    staffAssigned: string;
    status: 'SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED';
}

// ============================================================
// DUMMY USERS — 9 users, one per role
// ============================================================
export const DUMMY_USERS: User[] = [
    { id: 'u1', name: 'Rajesh Patel', email: 'rajesh@maruti.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rajesh', role: 'ADMIN', status: 'ACTIVE', phone: '+91 98765 43210', joinedAt: '2022-01-15' },
    { id: 'u2', name: 'Alex Thompson', email: 'alex@maruti.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', role: 'SALES', status: 'ACTIVE', phone: '+91 87654 32109', joinedAt: '2022-03-10' },
    { id: 'u3', name: 'Sarah Chen', email: 'sarah@maruti.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', role: 'DESIGN', status: 'ACTIVE', phone: '+91 76543 21098', joinedAt: '2022-06-01' },
    { id: 'u4', name: 'Vikram Joshi', email: 'vikram@maruti.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram', role: 'STORE', status: 'ACTIVE', phone: '+91 65432 10987', joinedAt: '2023-01-20' },
    { id: 'u5', name: 'Marcus Miller', email: 'marcus@maruti.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus', role: 'PRODUCTION', status: 'ACTIVE', phone: '+91 54321 09876', joinedAt: '2022-09-15' },
    { id: 'u6', name: 'Priya Sharma', email: 'priya@maruti.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya', role: 'QC', status: 'ACTIVE', phone: '+91 43210 98765', joinedAt: '2023-03-01' },
    { id: 'u7', name: 'Suresh Kumar', email: 'suresh@maruti.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Suresh', role: 'DISPATCH', status: 'ACTIVE', phone: '+91 32109 87654', joinedAt: '2023-05-15' },
    { id: 'u8', name: 'Anita Desai', email: 'anita@maruti.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anita', role: 'ACCOUNTANT', status: 'ACTIVE', phone: '+91 21098 76543', joinedAt: '2022-11-01' },
    { id: 'u9', name: 'James Wilson', email: 'james@maruti.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James', role: 'SALES', status: 'INACTIVE', phone: '+91 10987 65432', joinedAt: '2023-07-01' },
];

// ============================================================
// DUMMY CLIENTS — 8 clients
// ============================================================
export const DUMMY_CLIENTS: Client[] = [
    { id: 'c1', name: 'DLUXE OFFICE SPACES', email: 'contact@dluxe.com', phone: '+91 98765 43210', gstNumber: '24AAAAA0000A1Z5', gstVerified: true, address: 'B-401, Times Square', city: 'Ahmedabad', totalOrders: 12, totalValue: 1850000, createdAt: '2023-03-15' },
    { id: 'c2', name: 'ROYAL HEIGHTS APTS', email: 'ops@royalheights.in', phone: '+91 87654 32109', gstNumber: '24BBBBB1111B1Z6', gstVerified: true, address: 'Tower 3, Navrangpura', city: 'Ahmedabad', totalOrders: 5, totalValue: 620000, createdAt: '2023-07-20' },
    { id: 'c3', name: 'GALAXY SHOWROOM', email: 'info@galaxyshowroom.com', phone: '+91 76543 21098', gstNumber: '24CCCCC2222C1Z7', gstVerified: false, address: '12, Satellite Road', city: 'Ahmedabad', totalOrders: 8, totalValue: 980000, createdAt: '2023-01-10' },
    { id: 'c4', name: 'HOTEL REGENCY GRAND', email: 'gm@hotelregency.com', phone: '+91 65432 10987', gstNumber: '24DDDDD3333D1Z8', gstVerified: true, address: 'Opp. Law Garden', city: 'Ahmedabad', totalOrders: 20, totalValue: 3200000, createdAt: '2022-11-01' },
    { id: 'c5', name: 'SHANTI DEVELOPERS', email: 'info@shanti.in', phone: '+91 55555 44444', gstNumber: '24EEEEE4444E1Z9', gstVerified: true, address: 'Prahlad Nagar', city: 'Ahmedabad', totalOrders: 15, totalValue: 2100000, createdAt: '2022-08-22' },
    { id: 'c6', name: 'RAHUL ENTERPRISE', email: 'rahul@enterprise.com', phone: '+91 44444 33333', gstNumber: '24FFFFF5555F1Z1', gstVerified: true, address: 'Maninagar', city: 'Ahmedabad', totalOrders: 3, totalValue: 185000, createdAt: '2024-01-05' },
    { id: 'c7', name: 'SUNRISE RESIDENCY', email: 'admin@sunrise.co', phone: '+91 33333 22222', gstNumber: '24GGGGG6666G1Z2', gstVerified: false, address: 'Bopal', city: 'Ahmedabad', totalOrders: 2, totalValue: 95000, createdAt: '2024-02-01' },
    { id: 'c8', name: 'METRO CAFE CHAIN', email: 'ops@metrocafe.in', phone: '+91 22222 11111', gstNumber: '24HHHHH7777H1Z3', gstVerified: true, address: 'CG Road', city: 'Ahmedabad', totalOrders: 7, totalValue: 560000, createdAt: '2023-09-14' },
];

// ============================================================
// DUMMY JOB CARDS — 18 cards across all stages
// ============================================================
export const DUMMY_JOB_CARDS: JobCard[] = [
    { id: '1', jobNumber: 'JC-24-102', clientId: 'c1', clientName: 'DLUXE OFFICE SPACES', status: 'PRODUCTION', priority: 'URGENT', createdAt: '2024-02-01', updatedAt: '2024-02-26', deadline: '2024-03-10', description: 'Custom executive desks & glass partitions for 5000 sq ft office wing.', items: '12 Exec Desks, 3 Glass Partitions, 1 Reception Counter', estimatedValue: 450000, assignedTo: ['u5', 'u3'], whatsappGroupCreated: true, currentStage: 'PRODUCTION', daysInCurrentStage: 15, completionPercent: 65 },
    { id: '2', jobNumber: 'JC-24-105', clientId: 'c2', clientName: 'ROYAL HEIGHTS APTS', status: 'DESIGN', priority: 'HIGH', createdAt: '2024-02-05', updatedAt: '2024-02-25', deadline: '2024-03-20', description: 'Modular kitchen, wardrobe units for 3 BHK luxury apartment.', items: 'L-Shape Kitchen, 3-Door Wardrobe x2, TV Unit', estimatedValue: 180000, assignedTo: ['u3'], whatsappGroupCreated: true, currentStage: 'DESIGN', daysInCurrentStage: 9, completionPercent: 30 },
    { id: '3', jobNumber: 'JC-24-112', clientId: 'c3', clientName: 'GALAXY SHOWROOM', status: 'QC', priority: 'HIGH', createdAt: '2024-02-10', updatedAt: '2024-02-27', deadline: '2024-03-05', description: 'Custom display racks and billing counters for furniture showroom.', items: '8 Display Racks, 2 Billing Counters, 1 Storage Unit', estimatedValue: 220000, assignedTo: ['u5', 'u6'], whatsappGroupCreated: true, currentStage: 'QC', daysInCurrentStage: 2, completionPercent: 88 },
    { id: '4', jobNumber: 'JC-24-115', clientId: 'c4', clientName: 'HOTEL REGENCY GRAND', status: 'PRODUCTION', priority: 'HIGH', createdAt: '2024-02-12', updatedAt: '2024-02-26', deadline: '2024-03-15', description: 'Lobby furniture, restaurant seating for 5-star hotel.', items: '20 Restaurant Tables, 80 Chairs, 6 Lobby Sofas, 3 Reception Desks', estimatedValue: 850000, assignedTo: ['u5', 'u4'], whatsappGroupCreated: true, currentStage: 'POLISHING', daysInCurrentStage: 4, completionPercent: 75 },
    { id: '5', jobNumber: 'JC-24-118', clientId: 'c1', clientName: 'DLUXE OFFICE SPACES', status: 'ENQUIRY', priority: 'MEDIUM', createdAt: '2024-02-25', updatedAt: '2024-02-25', deadline: '2024-04-01', description: 'Ergonomic chairs and meeting room tables for new floor expansion.', items: '50 Ergonomic Chairs, 5 Meeting Tables', estimatedValue: 95000, assignedTo: ['u2'], whatsappGroupCreated: false, currentStage: 'ENQUIRY', daysInCurrentStage: 2, completionPercent: 5 },
    { id: '6', jobNumber: 'JC-24-088', clientId: 'c5', clientName: 'SHANTI DEVELOPERS', status: 'DISPATCH', priority: 'HIGH', createdAt: '2024-01-20', updatedAt: '2024-02-28', deadline: '2024-03-01', description: 'Complete bedroom furniture set for model flat showcase.', items: 'King Bed, 2 Side Tables, Dresser, 4-Door Wardrobe', estimatedValue: 145000, assignedTo: ['u7', 'u5'], whatsappGroupCreated: true, currentStage: 'DISPATCH', daysInCurrentStage: 1, completionPercent: 95 },
    { id: '7', jobNumber: 'JC-24-092', clientId: 'c4', clientName: 'HOTEL REGENCY GRAND', status: 'DESIGN', priority: 'MEDIUM', createdAt: '2024-01-25', updatedAt: '2024-02-20', deadline: '2024-03-25', description: 'Suite bathroom vanities and guest room furniture for 20 rooms.', items: '20 Bathroom Vanities, 20 Bed Frames, 20 Side Tables', estimatedValue: 380000, assignedTo: ['u3'], whatsappGroupCreated: true, currentStage: 'DESIGN', daysInCurrentStage: 9, completionPercent: 25 },
    { id: '8', jobNumber: 'JC-24-098', clientId: 'c8', clientName: 'METRO CAFE CHAIN', status: 'PRODUCTION', priority: 'HIGH', createdAt: '2024-02-01', updatedAt: '2024-02-24', deadline: '2024-03-08', description: 'Cafe seating, counter, and bar stools for new outlet.', items: '15 Cafe Tables, 60 Chairs, 10 Bar Stools, 1 Counter', estimatedValue: 210000, assignedTo: ['u5'], whatsappGroupCreated: true, currentStage: 'FABRICATION', daysInCurrentStage: 6, completionPercent: 55 },
    { id: '9', jobNumber: 'JC-24-075', clientId: 'c5', clientName: 'SHANTI DEVELOPERS', status: 'ACCOUNTS', priority: 'LOW', createdAt: '2024-01-05', updatedAt: '2024-02-22', deadline: '2024-02-28', description: 'Study room furniture for 10 residential units.', items: '10 Study Tables, 10 Bookshelves, 10 Study Chairs', estimatedValue: 95000, assignedTo: ['u8'], whatsappGroupCreated: true, currentStage: 'ACCOUNTS', daysInCurrentStage: 3, completionPercent: 98 },
    { id: '10', jobNumber: 'JC-24-060', clientId: 'c4', clientName: 'HOTEL REGENCY GRAND', status: 'CLOSED', priority: 'URGENT', createdAt: '2023-12-01', updatedAt: '2024-02-10', deadline: '2024-02-15', description: 'Banquet hall stage podium and event furniture.', items: 'Stage Setup, 50 Banquet Chairs, 10 Round Tables, Podium', estimatedValue: 280000, assignedTo: ['u5', 'u7'], whatsappGroupCreated: true, currentStage: 'CLOSED', daysInCurrentStage: 0, completionPercent: 100 },
    { id: '11', jobNumber: 'JC-24-122', clientId: 'c6', clientName: 'RAHUL ENTERPRISE', status: 'SALES', priority: 'LOW', createdAt: '2024-02-26', updatedAt: '2024-02-26', deadline: '2024-04-15', description: 'Office workstations for 8 employees.', items: '8 Workstation Units, 8 Pedestals, 8 Office Chairs', estimatedValue: 85000, assignedTo: ['u2'], whatsappGroupCreated: false, currentStage: 'SALES', daysInCurrentStage: 1, completionPercent: 8 },
    { id: '12', jobNumber: 'JC-24-108', clientId: 'c7', clientName: 'SUNRISE RESIDENCY', status: 'STORE', priority: 'MEDIUM', createdAt: '2024-02-08', updatedAt: '2024-02-23', deadline: '2024-03-30', description: 'Living room furniture for clubhouse area.', items: '4 Sofas, 2 Coffee Tables, TV Unit, 1 Console Table', estimatedValue: 95000, assignedTo: ['u4', 'u3'], whatsappGroupCreated: true, currentStage: 'MATERIAL READY', daysInCurrentStage: 3, completionPercent: 40 },
    { id: '13', jobNumber: 'JC-24-095', clientId: 'c3', clientName: 'GALAXY SHOWROOM', status: 'PRODUCTION', priority: 'URGENT', createdAt: '2024-01-28', updatedAt: '2024-02-25', deadline: '2024-03-03', description: 'Showroom entrance feature wall and display pedestals.', items: '1 Feature Wall Unit, 12 Display Pedestals, 2 Islands', estimatedValue: 175000, assignedTo: ['u5'], whatsappGroupCreated: true, currentStage: 'ASSEMBLY', daysInCurrentStage: 8, completionPercent: 72 },
    { id: '14', jobNumber: 'JC-24-110', clientId: 'c8', clientName: 'METRO CAFE CHAIN', status: 'QC', priority: 'MEDIUM', createdAt: '2024-02-05', updatedAt: '2024-02-26', deadline: '2024-03-10', description: 'Outdoor garden furniture for rooftop cafe.', items: '10 Weather-proof Tables, 40 Rattan Chairs, 4 Umbrellas', estimatedValue: 130000, assignedTo: ['u6'], whatsappGroupCreated: true, currentStage: 'FINAL QC', daysInCurrentStage: 1, completionPercent: 90 },
    { id: '15', jobNumber: 'JC-24-119', clientId: 'c1', clientName: 'DLUXE OFFICE SPACES', status: 'ADMIN', priority: 'HIGH', createdAt: '2024-02-24', updatedAt: '2024-02-27', deadline: '2024-04-20', description: 'Conference room AV furniture and cable management systems.', items: 'Conference Table 20-seater, 20 Chairs, AV Cabinet, Podium', estimatedValue: 320000, assignedTo: ['u1'], whatsappGroupCreated: false, currentStage: 'ADMIN REVIEW', daysInCurrentStage: 2, completionPercent: 12 },
    { id: '16', jobNumber: 'JC-24-081', clientId: 'c2', clientName: 'ROYAL HEIGHTS APTS', status: 'CLOSED', priority: 'MEDIUM', createdAt: '2023-12-15', updatedAt: '2024-02-05', deadline: '2024-02-10', description: 'Children\'s bedroom furniture for 2 units.', items: 'Bunk Bed x2, Study Table x2, Toy Storage x2', estimatedValue: 65000, assignedTo: ['u5', 'u7'], whatsappGroupCreated: true, currentStage: 'CLOSED', daysInCurrentStage: 0, completionPercent: 100 },
    { id: '17', jobNumber: 'JC-24-125', clientId: 'c5', clientName: 'SHANTI DEVELOPERS', status: 'ENQUIRY', priority: 'HIGH', createdAt: '2024-02-27', updatedAt: '2024-02-27', deadline: '2024-04-30', description: 'Amenities area furniture for residential complex — 200 units.', items: 'Pool Chairs x50, Gym Benches x10, Common Area Sofas x20', estimatedValue: 750000, assignedTo: ['u2'], whatsappGroupCreated: false, currentStage: 'ENQUIRY', daysInCurrentStage: 0, completionPercent: 2 },
    { id: '18', jobNumber: 'JC-24-070', clientId: 'c4', clientName: 'HOTEL REGENCY GRAND', status: 'DISPATCH', priority: 'MEDIUM', createdAt: '2024-01-10', updatedAt: '2024-02-27', deadline: '2024-03-01', description: 'In-room minibar units and luggage racks for 50 rooms.', items: '50 Minibar Units, 50 Luggage Racks, 50 Closets', estimatedValue: 420000, assignedTo: ['u7'], whatsappGroupCreated: true, currentStage: 'LOADING', daysInCurrentStage: 0, completionPercent: 96 },
];

// ============================================================
// DUMMY INVOICES
// ============================================================
export const DUMMY_INVOICES: Invoice[] = [
    { id: 'inv1', invoiceNumber: 'INV-24-012', jobCardId: '9', clientName: 'SHANTI DEVELOPERS', amount: 95000, gstAmount: 17100, status: 'OVERDUE', dueDate: '2024-02-24', createdAt: '2024-02-10' },
    { id: 'inv2', invoiceNumber: 'INV-24-045', jobCardId: '6', clientName: 'RAHUL ENTERPRISE', amount: 25800, gstAmount: 4644, status: 'OVERDUE', dueDate: '2024-02-20', createdAt: '2024-02-06' },
    { id: 'inv3', invoiceNumber: 'INV-24-056', jobCardId: '3', clientName: 'GALAXY SHOWROOM', amount: 220000, gstAmount: 39600, status: 'SENT', dueDate: '2024-03-05', createdAt: '2024-02-20' },
    { id: 'inv4', invoiceNumber: 'INV-24-061', jobCardId: '10', clientName: 'HOTEL REGENCY GRAND', amount: 280000, gstAmount: 50400, status: 'PAID', dueDate: '2024-02-28', createdAt: '2024-02-15', paymentMode: 'NEFT' },
    { id: 'inv5', invoiceNumber: 'INV-24-038', jobCardId: '16', clientName: 'ROYAL HEIGHTS APTS', amount: 65000, gstAmount: 11700, status: 'PAID', dueDate: '2024-02-20', createdAt: '2024-02-05', paymentMode: 'UPI' },
    { id: 'inv6', invoiceNumber: 'INV-24-068', jobCardId: '13', clientName: 'GALAXY SHOWROOM', amount: 87500, gstAmount: 15750, status: 'DRAFT', dueDate: '2024-03-15', createdAt: '2024-02-25' },
];

// ============================================================
// DUMMY QUOTATIONS
// ============================================================
export const DUMMY_QUOTATIONS: Quotation[] = [
    { id: 'q1', quotationNumber: 'QT-24-015', jobCardId: '1', clientName: 'DLUXE OFFICE SPACES', amount: 450000, status: 'APPROVED', createdAt: '2024-02-03', validUntil: '2024-03-03' },
    { id: 'q2', quotationNumber: 'QT-24-018', jobCardId: '4', clientName: 'HOTEL REGENCY GRAND', amount: 850000, status: 'APPROVED', createdAt: '2024-02-14', validUntil: '2024-03-14' },
    { id: 'q3', quotationNumber: 'QT-24-021', jobCardId: '2', clientName: 'ROYAL HEIGHTS APTS', amount: 180000, status: 'SENT', createdAt: '2024-02-07', validUntil: '2024-03-07' },
    { id: 'q4', quotationNumber: 'QT-24-024', jobCardId: '17', clientName: 'SHANTI DEVELOPERS', amount: 750000, status: 'DRAFT', createdAt: '2024-02-27', validUntil: '2024-03-27' },
];

// ============================================================
// DUMMY INVENTORY — 10 items
// ============================================================
export const DUMMY_INVENTORY: InventoryItem[] = [
    { id: 'i1', name: 'Plywood 18mm (BWR)', category: 'Wood', stockLevel: 45, unit: 'Sheets', lowStockThreshold: 50, unitPrice: 2800, supplier: 'Greenply Industries', lastRestocked: '2024-02-10' },
    { id: 'i2', name: 'Plywood 12mm (MR)', category: 'Wood', stockLevel: 80, unit: 'Sheets', lowStockThreshold: 30, unitPrice: 1800, supplier: 'Greenply Industries', lastRestocked: '2024-02-10' },
    { id: 'i3', name: 'Laminate High Gloss White', category: 'Finishes', stockLevel: 120, unit: 'Sheets', lowStockThreshold: 30, unitPrice: 650, supplier: 'Merino Laminates', lastRestocked: '2024-02-15' },
    { id: 'i4', name: 'Laminate Walnut Veneer', category: 'Finishes', stockLevel: 28, unit: 'Sheets', lowStockThreshold: 30, unitPrice: 850, supplier: 'Merino Laminates', lastRestocked: '2024-02-08' },
    { id: 'i5', name: 'Fevicol SH (Construction)', category: 'Adhesives', stockLevel: 12, unit: 'KG', lowStockThreshold: 20, unitPrice: 180, supplier: 'Pidilite Industries', lastRestocked: '2024-02-05' },
    { id: 'i6', name: 'SS Piano Hinges', category: 'Hardware', stockLevel: 500, unit: 'Pcs', lowStockThreshold: 100, unitPrice: 45, supplier: 'Häfele India', lastRestocked: '2024-02-20' },
    { id: 'i7', name: 'Drawer Channels (Full Extension)', category: 'Hardware', stockLevel: 85, unit: 'Pairs', lowStockThreshold: 50, unitPrice: 320, supplier: 'Häfele India', lastRestocked: '2024-02-18' },
    { id: 'i8', name: 'Edge Banding Tape (White)', category: 'Finishes', stockLevel: 15, unit: 'Rolls', lowStockThreshold: 20, unitPrice: 280, supplier: 'Rehau India', lastRestocked: '2024-02-01' },
    { id: 'i9', name: 'Foam (HR Grade 40D)', category: 'Upholstery', stockLevel: 3, unit: 'Sheets', lowStockThreshold: 10, unitPrice: 1200, supplier: 'Sheela Foam', lastRestocked: '2024-01-25' },
    { id: 'i10', name: 'Fabric (Oscar Navy)', category: 'Upholstery', stockLevel: 42, unit: 'Metres', lowStockThreshold: 20, unitPrice: 380, supplier: 'Raymond UCO', lastRestocked: '2024-02-12' },
];

// ============================================================
// DUMMY PURCHASE ORDERS
// ============================================================
export const DUMMY_PURCHASE_ORDERS: PurchaseOrder[] = [
    { id: 'po1', poNumber: 'PO-24-008', supplier: 'Greenply Industries', items: 'Plywood 18mm x 50 Sheets', totalAmount: 140000, status: 'APPROVED', raisedBy: 'Vikram Joshi', expectedDate: '2024-03-03', createdAt: '2024-02-25' },
    { id: 'po2', poNumber: 'PO-24-009', supplier: 'Sheela Foam', items: 'HR Grade 40D Foam x 10 Sheets', totalAmount: 12000, status: 'PENDING', raisedBy: 'Vikram Joshi', expectedDate: '2024-03-05', createdAt: '2024-02-27' },
    { id: 'po3', poNumber: 'PO-24-007', supplier: 'Rehau India', items: 'Edge Banding Tape x 30 Rolls', totalAmount: 8400, status: 'DELIVERED', raisedBy: 'Vikram Joshi', expectedDate: '2024-02-20', createdAt: '2024-02-15' },
];

// ============================================================
// DUMMY WHATSAPP LOGS
// ============================================================
export const DUMMY_WHATSAPP_LOGS: WhatsAppLogEntry[] = [
    { id: 'w1', message: 'JC-24-102 moved to Production stage. Marcus assigned.', recipient: 'DLUXE OFFICE', jobNumber: 'JC-24-102', time: '2m ago', status: 'read' },
    { id: 'w2', message: 'Invoice INV-24-012 sent. ₹95,000 due by 24 Feb.', recipient: 'SHANTI DEVELOPERS', time: '1h ago', status: 'read' },
    { id: 'w3', message: 'Design sign-off requested for JC-24-105. Please review.', recipient: 'ROYAL HEIGHTS', jobNumber: 'JC-24-105', time: '3h ago', status: 'delivered' },
    { id: 'w4', message: 'JC-24-088 scheduled for delivery TOMORROW 10am–12pm.', recipient: 'SHANTI DEVELOPERS', jobNumber: 'JC-24-088', time: '5h ago', status: 'read' },
    { id: 'w5', message: 'QC passed for JC-24-112. Dispatch team notified.', recipient: 'GALAXY SHOWROOM', jobNumber: 'JC-24-112', time: '8h ago', status: 'delivered' },
];

// ============================================================
// DUMMY ACTIVITY FEED
// ============================================================
export const DUMMY_ACTIVITIES: ActivityEntry[] = [
    { id: 'a1', jobNumber: 'JC-24-102', action: 'Stage changed to PRODUCTION', actor: 'Rajesh Patel', actorRole: 'ADMIN', timestamp: '2024-02-26 14:32', details: 'Assigned to Marcus Miller' },
    { id: 'a2', jobNumber: 'JC-24-112', action: 'QC Passed', actor: 'Priya Sharma', actorRole: 'QC', timestamp: '2024-02-27 10:15', details: 'All 24 checklist items passed' },
    { id: 'a3', jobNumber: 'JC-24-105', action: 'Design uploaded', actor: 'Sarah Chen', actorRole: 'DESIGN', timestamp: '2024-02-25 16:45', details: 'CAD drawings + 3D render uploaded' },
    { id: 'a4', jobNumber: 'JC-24-088', action: 'Delivery scheduled', actor: 'Suresh Kumar', actorRole: 'DISPATCH', timestamp: '2024-02-27 09:00', details: 'Tomorrow 10am–12pm slot confirmed' },
    { id: 'a5', jobNumber: 'PO-24-008', action: 'Purchase Order raised', actor: 'Vikram Joshi', actorRole: 'STORE', timestamp: '2024-02-25 11:20', details: '50 Sheets Plywood 18mm from Greenply' },
    { id: 'a6', jobNumber: 'JC-24-118', action: 'New enquiry created', actor: 'Alex Thompson', actorRole: 'SALES', timestamp: '2024-02-25 09:45', details: 'Client: Dluxe Office Spaces' },
];

// ============================================================
// DUMMY DELIVERIES
// ============================================================
export const DUMMY_DELIVERIES: DeliveryEntry[] = [
    { id: 'd1', jobNumber: 'JC-24-088', clientName: 'SHANTI DEVELOPERS', address: 'Prahlad Nagar, Ahmedabad', city: 'Ahmedabad', date: 'Tomorrow', timeSlot: '10:00 AM – 12:00 PM', staffAssigned: 'Suresh Kumar', status: 'SCHEDULED' },
    { id: 'd2', jobNumber: 'JC-24-018', clientName: 'HOTEL REGENCY GRAND', address: 'Law Garden, Ahmedabad', city: 'Ahmedabad', date: '28 Feb', timeSlot: '2:00 PM – 5:00 PM', staffAssigned: 'Suresh Kumar', status: 'SCHEDULED' },
    { id: 'd3', jobNumber: 'JC-24-060', clientName: 'HOTEL REGENCY GRAND', address: 'Law Garden, Ahmedabad', city: 'Ahmedabad', date: '26 Feb', timeSlot: '11:00 AM – 2:00 PM', staffAssigned: 'Suresh Kumar', status: 'DELIVERED' },
];

// ============================================================
// NAVIGATION STRUCTURE
// ============================================================
export const NAV_MAIN = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutGrid,
        isActive: true,
        items: [
            { title: "Overview", url: "#" },
            { title: "Analytics", url: "#" },
            { title: "Reports", url: "#" },
        ],
    },
    {
        title: "Job Cards",
        url: "/job-cards",
        icon: ClipboardList,
        items: [
            { title: "All Job Cards", url: "#" },
            { title: "Design Queue", url: "#" },
            { title: "Production Floor", url: "#" },
            { title: "QC Pending", url: "#" },
        ],
    },
    {
        title: "Clients",
        url: "/clients",
        icon: Users,
    },
    {
        title: "Inventory",
        url: "/inventory",
        icon: Package,
        items: [
            { title: "Stock Overview", url: "#" },
            { title: "Purchase Orders", url: "#" },
        ],
    },
    {
        title: "Financial",
        url: "/financial",
        icon: Banknote,
        items: [
            { title: "Invoices", url: "#" },
            { title: "Quotations", url: "#" },
            { title: "Payments", url: "#" },
        ],
    },
    {
        title: "Dispatch",
        url: "/dispatch",
        icon: Truck,
        items: [
            { title: "Dispatch Queue", url: "#" },
            { title: "Deliveries", url: "#" },
        ],
    },
    {
        title: "Quality Control",
        url: "/qc",
        icon: CheckSquare,
    },
    {
        title: "Reports",
        url: "/reports",
        icon: BarChart3,
    },
    {
        title: "Users",
        url: "/users",
        icon: UserCog,
    },
    {
        title: "Roles",
        url: "/roles",
        icon: ShieldCheck,
    },
    {
        title: "WhatsApp",
        url: "/whatsapp",
        icon: MessageSquare,
    },
    {
        title: "Settings",
        url: "/settings",
        icon: Settings,
    },
];

// ============================================================
// DASHBOARD COMPUTED STATS
// ============================================================
export const DASHBOARD_STATS = {
    activeJobs: {
        value: DUMMY_JOB_CARDS.filter(j => !['CLOSED', 'ENQUIRY'].includes(j.status)).length,
        change: 12.5,
        label: 'Active Jobs'
    },
    revenueMTD: {
        value: 2480000,
        change: 18.2,
        label: 'Revenue MTD (₹)'
    },
    overdueInvoices: {
        value: DUMMY_INVOICES.filter(i => i.status === 'OVERDUE').length,
        change: -5.0,
        label: 'Overdue Invoices'
    },
    pendingQC: {
        value: DUMMY_JOB_CARDS.filter(j => j.status === 'QC').length,
        change: 8.2,
        label: 'QC Pending'
    },
    weeklyDeliveries: {
        value: 7,
        change: 22.4,
        label: 'This Week Deliveries'
    },
    lowStockAlerts: {
        value: DUMMY_INVENTORY.filter(i => i.stockLevel < i.lowStockThreshold).length,
        change: 0,
        label: 'Low Stock Alerts'
    }
};

export const STATUS_STATS = [
    { status: "ENQUIRY", count: DUMMY_JOB_CARDS.filter(j => j.status === 'ENQUIRY').length, color: "#767A8C" },
    { status: "DESIGN", count: DUMMY_JOB_CARDS.filter(j => j.status === 'DESIGN').length, color: "#8B5CF6" },
    { status: "STORE", count: DUMMY_JOB_CARDS.filter(j => j.status === 'STORE').length, color: "#F59E0B" },
    { status: "PRODUCTION", count: DUMMY_JOB_CARDS.filter(j => j.status === 'PRODUCTION').length, color: "#1315E5" },
    { status: "QC", count: DUMMY_JOB_CARDS.filter(j => j.status === 'QC').length, color: "#10B981" },
    { status: "DISPATCH", count: DUMMY_JOB_CARDS.filter(j => j.status === 'DISPATCH').length, color: "#F97316" },
    { status: "CLOSED", count: DUMMY_JOB_CARDS.filter(j => j.status === 'CLOSED').length, color: "#131415" },
];

export const FINANCIAL_SUMMARY = {
    totalRevenue: 12480000,
    receivables: 820000,
    gstCollected: 680000,
    overdueAmount: DUMMY_INVOICES.filter(i => i.status === 'OVERDUE').reduce((sum, i) => sum + i.amount, 0),
    thisMonthCollection: 2480000,
    pendingPayments: 3,
};

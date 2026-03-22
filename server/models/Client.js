import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
    },
    clientType: {
        type: String,
        enum: ['direct_client', 'architect', 'project_designer', 'factory_manager'],
        default: 'direct_client',
    },
    firstName: { type: String, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    firmName: {
        type: String,
        trim: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: function(v) {
                return /^[6-9]\d{9}$/.test(v);
            },
            message: props => `${props.value} is not a valid 10-digit Indian mobile number!`
        }
    },
    whatsappNumber: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                if (!v) return true;
                return /^[6-9]\d{9}$/.test(v);
            },
            message: props => `${props.value} is not a valid 10-digit mobile number!`
        }
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        validate: {
            validator: function(v) {
                if (!v) return true;
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: props => `${props.value} is not a valid email address!`
        }
    },
    gstin: {
        type: String,
        trim: true,
        uppercase: true,
    },
    gstVerified: {
        type: Boolean,
        default: false,
    },
    address: {
        houseNumber: String,
        line1: String,
        line2: String,
        city: String,
        pincode: String,
    },
    notes: String,
    isActive: {
        type: Boolean,
        default: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});

// Auto-compute full name BEFORE validation so 'required' check passes
clientSchema.pre('validate', function() {
    if (this.firstName || this.lastName) {
        this.name = [this.firstName, this.middleName, this.lastName]
            .filter(Boolean)
            .join(' ')
            .trim();
    }
});

// Index for search
clientSchema.index({ name: 'text', firmName: 'text', phone: 'text', email: 'text' });

const Client = mongoose.model('Client', clientSchema);

export default Client;

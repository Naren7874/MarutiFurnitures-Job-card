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
    const capitalize = (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    if (this.firstName || this.lastName) {
        const first = capitalize(this.firstName);
        const middle = this.middleName ? this.middleName.charAt(0).toUpperCase() : '';
        const last = capitalize(this.lastName);

        // Filter out empty strings and join with hyphens
        this.name = [first, middle, last]
            .filter(Boolean)
            .join('-');
            
        // Also update individual fields to their capitalized versions
        if (this.firstName) this.firstName = first;
        if (this.lastName) this.lastName = last;
        // Note: keeping middleName as is, but name uses the initial. 
        // If user wants middleName to be initial only in the model too, I can change it.
        // The request says "always show middle name as only First lettter", which usually refers to display.
        // But the user also said "it should by Naren-G-Mali".
    }
});

// Index for search
clientSchema.index({ name: 'text', firmName: 'text', phone: 'text', email: 'text' });

const Client = mongoose.model('Client', clientSchema);

export default Client;

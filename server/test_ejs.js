import ejs from 'ejs';
import fs from 'fs';
import path from 'path';

const templatePath = '/home/narendra/Desktop/MarutiFurniture/server/templates/quotation.html';
const template = fs.readFileSync(templatePath, 'utf-8');

const data = {
  company: {
    name: 'Maruti Furniture',
    logo: null,
    address: { line1: 'Test Address', city: 'Test City', state: 'Test State', pincode: '380001' },
    phone: '1234567890'
  },
  quotation: {
    quotationNumber: 'MF – 150326_01 – Ravi Patel',
    createdAt: new Date(),
    projectName: 'Test Project',
    siteAddress: { location: 'Test Location' },
    deliveryDays: '10 days',
    validUntil: new Date(),
    subtotal: 1000,
    discount: 100,
    items: [
      { srNo: 1, description: 'Sofa', qty: 1, mrp: 1000, totalPrice: 900, category: 'Living' }
    ]
  },
  client: {
    name: 'Ravi Patel',
    phone: '9876543210'
  }
};

try {
  const html = ejs.render(template, data, { filename: templatePath });
  console.log('Rendering successful');
  fs.writeFileSync('/tmp/test_quotation.html', html);
} catch (err) {
  console.error('Rendering failed:', err);
}

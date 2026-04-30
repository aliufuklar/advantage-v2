import { useState, useEffect } from 'react';
import type { Customer, Address, ContactPerson, BankAccount } from '@/types';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSave: (data: Partial<Customer>) => Promise<void>;
  onDelete?: () => Promise<void>;
  isLoading?: boolean;
}

type TabType = 'basic' | 'contacts' | 'addresses' | 'bankAccounts';

const emptyAddress: Address = {
  id: '',
  label: '',
  street: '',
  city: '',
  district: '',
  postalCode: '',
  country: 'Turkey',
};

const emptyContact: ContactPerson = {
  id: '',
  name: '',
  phone: '',
  email: '',
  role: '',
};

const emptyBankAccount: BankAccount = {
  id: '',
  bankName: '',
  branchName: '',
  accountNumber: '',
  iban: '',
};

export function CustomerModal({ isOpen, onClose, customer, onSave, onDelete, isLoading }: CustomerModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [formData, setFormData] = useState({
    legalName: '',
    shortName: '',
    customerType: 'customer',
    email: '',
    phone: '',
    taxOffice: '',
    taxId: '',
    isActive: true,
    addresses: [] as Address[],
    contacts: [] as ContactPerson[],
    bankAccounts: [] as BankAccount[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // New item states for adding
  const [newAddress, setNewAddress] = useState<Address>({ ...emptyAddress });
  const [newContact, setNewContact] = useState<ContactPerson>({ ...emptyContact });
  const [newBankAccount, setNewBankAccount] = useState<BankAccount>({ ...emptyBankAccount });

  useEffect(() => {
    if (customer) {
      setFormData({
        legalName: customer.legalName || '',
        shortName: customer.shortName || '',
        customerType: customer.customerType || 'customer',
        email: customer.email || '',
        phone: customer.phone || '',
        taxOffice: customer.taxOffice || '',
        taxId: customer.taxId || '',
        isActive: customer.isActive ?? true,
        addresses: customer.addresses || [],
        contacts: customer.contacts || [],
        bankAccounts: customer.bankAccounts || [],
      });
    } else {
      setFormData({
        legalName: '',
        shortName: '',
        customerType: 'customer',
        email: '',
        phone: '',
        taxOffice: '',
        taxId: '',
        isActive: true,
        addresses: [],
        contacts: [],
        bankAccounts: [],
      });
    }
    setErrors({});
    setActiveTab('basic');
  }, [customer, isOpen]);

  const handleInputChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.legalName.trim()) {
      newErrors.legalName = 'Legal name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Are you sure you want to delete this customer?')) return;
    setSaving(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to delete' });
    } finally {
      setSaving(false);
    }
  };

  // Address handlers
  const addAddress = () => {
    const addr = { ...newAddress, id: `new_${Date.now()}` };
    setFormData(prev => ({ ...prev, addresses: [...prev.addresses, addr] }));
    setNewAddress({ ...emptyAddress });
  };

  const removeAddress = (id: string) => {
    setFormData(prev => ({ ...prev, addresses: prev.addresses.filter(a => a.id !== id) }));
  };

  const updateAddress = (id: string, field: keyof Address, value: string) => {
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses.map(a => a.id === id ? { ...a, [field]: value } : a),
    }));
  };

  // Contact handlers
  const addContact = () => {
    const contact = { ...newContact, id: `new_${Date.now()}` };
    setFormData(prev => ({ ...prev, contacts: [...prev.contacts, contact] }));
    setNewContact({ ...emptyContact });
  };

  const removeContact = (id: string) => {
    setFormData(prev => ({ ...prev, contacts: prev.contacts.filter(c => c.id !== id) }));
  };

  const updateContact = (id: string, field: keyof ContactPerson, value: string) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map(c => c.id === id ? { ...c, [field]: value } : c),
    }));
  };

  // Bank account handlers
  const addBankAccount = () => {
    const ba = { ...newBankAccount, id: `new_${Date.now()}` };
    setFormData(prev => ({ ...prev, bankAccounts: [...prev.bankAccounts, ba] }));
    setNewBankAccount({ ...emptyBankAccount });
  };

  const removeBankAccount = (id: string) => {
    setFormData(prev => ({ ...prev, bankAccounts: prev.bankAccounts.filter(b => b.id !== id) }));
  };

  const updateBankAccount = (id: string, field: keyof BankAccount, value: string) => {
    setFormData(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.map(b => b.id === id ? { ...b, [field]: value } : b),
    }));
  };

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string }[] = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'contacts', label: `Contacts (${formData.contacts.length})` },
    { id: 'addresses', label: `Addresses (${formData.addresses.length})` },
    { id: 'bankAccounts', label: `Bank Accounts (${formData.bankAccounts.length})` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {customer ? 'Edit Customer' : 'New Customer'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={saving}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Legal Name *
                  </label>
                  <input
                    type="text"
                    value={formData.legalName}
                    onChange={e => handleInputChange('legalName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.legalName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter legal name"
                  />
                  {errors.legalName && (
                    <p className="mt-1 text-sm text-red-600">{errors.legalName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Short Name
                  </label>
                  <input
                    type="text"
                    value={formData.shortName}
                    onChange={e => handleInputChange('shortName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter short name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Type
                  </label>
                  <select
                    value={formData.customerType}
                    onChange={e => handleInputChange('customerType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="customer">Customer</option>
                    <option value="supplier">Supplier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.isActive ? 'active' : 'inactive'}
                    onChange={e => handleInputChange('isActive', e.target.value === 'active')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="+90 555 123 4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Office
                  </label>
                  <input
                    type="text"
                    value={formData.taxOffice}
                    onChange={e => handleInputChange('taxOffice', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter tax office"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax ID
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={e => handleInputChange('taxId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter tax ID"
                  />
                </div>
              </div>

              {customer && (
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Customer Number
                    </label>
                    <p className="text-gray-900 font-medium">{customer.customerNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Balance
                    </label>
                    <p className={`font-medium ${
                      (customer.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {customer.balance?.toFixed(2) || '0.00'} TL
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Created
                    </label>
                    <p className="text-gray-700">
                      {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('tr-TR') : '-'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
            <div className="space-y-4">
              {/* Add new contact form */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900">Add New Contact</h4>
                <div className="grid grid-cols-4 gap-3">
                  <input
                    type="text"
                    value={newContact.name}
                    onChange={e => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Name *"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="tel"
                    value={newContact.phone}
                    onChange={e => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={e => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    value={newContact.role}
                    onChange={e => setNewContact(prev => ({ ...prev, role: e.target.value }))}
                    placeholder="Role"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <button
                  onClick={addContact}
                  disabled={!newContact.name.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Add Contact
                </button>
              </div>

              {/* Contact list */}
              {formData.contacts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No contacts added yet</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {formData.contacts.map(contact => (
                    <div key={contact.id} className="py-3 flex items-start justify-between">
                      <div className="flex-1 grid grid-cols-4 gap-4">
                        <div>
                          <p className="font-medium text-gray-900">{contact.name}</p>
                          <input
                            type="text"
                            value={contact.role}
                            onChange={e => updateContact(contact.id!, 'role', e.target.value)}
                            placeholder="Role"
                            className="mt-1 w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">{contact.phone || '-'}</p>
                          <input
                            type="tel"
                            value={contact.phone}
                            onChange={e => updateContact(contact.id!, 'phone', e.target.value)}
                            placeholder="Phone"
                            className="mt-1 w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">{contact.email || '-'}</p>
                          <input
                            type="email"
                            value={contact.email}
                            onChange={e => updateContact(contact.id!, 'email', e.target.value)}
                            placeholder="Email"
                            className="mt-1 w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                        <div></div>
                      </div>
                      <button
                        onClick={() => removeContact(contact.id!)}
                        className="ml-4 text-red-600 hover:text-red-800"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Addresses Tab */}
          {activeTab === 'addresses' && (
            <div className="space-y-4">
              {/* Add new address form */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900">Add New Address</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newAddress.label}
                    onChange={e => setNewAddress(prev => ({ ...prev, label: e.target.value }))}
                    placeholder="Label (e.g., Main Office) *"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    value={newAddress.street}
                    onChange={e => setNewAddress(prev => ({ ...prev, street: e.target.value }))}
                    placeholder="Street"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    value={newAddress.city}
                    onChange={e => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    value={newAddress.district}
                    onChange={e => setNewAddress(prev => ({ ...prev, district: e.target.value }))}
                    placeholder="District"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    value={newAddress.postalCode}
                    onChange={e => setNewAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                    placeholder="Postal Code"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    value={newAddress.country}
                    onChange={e => setNewAddress(prev => ({ ...prev, country: e.target.value }))}
                    placeholder="Country"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <button
                  onClick={addAddress}
                  disabled={!newAddress.label.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Add Address
                </button>
              </div>

              {/* Address list */}
              {formData.addresses.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No addresses added yet</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {formData.addresses.map(addr => (
                    <div key={addr.id} className="py-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div>
                            <input
                              type="text"
                              value={addr.label}
                              onChange={e => updateAddress(addr.id!, 'label', e.target.value)}
                              placeholder="Label"
                              className="font-medium px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                              {[addr.street, addr.district, addr.city, addr.postalCode, addr.country]
                                .filter(Boolean)
                                .join(', ') || 'No address details'}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={addr.street}
                              onChange={e => updateAddress(addr.id!, 'street', e.target.value)}
                              placeholder="Street"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={addr.city}
                                onChange={e => updateAddress(addr.id!, 'city', e.target.value)}
                                placeholder="City"
                                className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                              <input
                                type="text"
                                value={addr.district}
                                onChange={e => updateAddress(addr.id!, 'district', e.target.value)}
                                placeholder="District"
                                className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeAddress(addr.id!)}
                          className="ml-4 text-red-600 hover:text-red-800"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bank Accounts Tab */}
          {activeTab === 'bankAccounts' && (
            <div className="space-y-4">
              {/* Add new bank account form */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900">Add New Bank Account</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newBankAccount.bankName}
                    onChange={e => setNewBankAccount(prev => ({ ...prev, bankName: e.target.value }))}
                    placeholder="Bank Name *"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    value={newBankAccount.branchName}
                    onChange={e => setNewBankAccount(prev => ({ ...prev, branchName: e.target.value }))}
                    placeholder="Branch Name"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    value={newBankAccount.accountNumber}
                    onChange={e => setNewBankAccount(prev => ({ ...prev, accountNumber: e.target.value }))}
                    placeholder="Account Number"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="text"
                    value={newBankAccount.iban}
                    onChange={e => setNewBankAccount(prev => ({ ...prev, iban: e.target.value }))}
                    placeholder="IBAN"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <button
                  onClick={addBankAccount}
                  disabled={!newBankAccount.bankName.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Add Bank Account
                </button>
              </div>

              {/* Bank account list */}
              {formData.bankAccounts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No bank accounts added yet</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {formData.bankAccounts.map(ba => (
                    <div key={ba.id} className="py-3 flex items-start justify-between">
                      <div className="flex-1 grid grid-cols-4 gap-4">
                        <div>
                          <input
                            type="text"
                            value={ba.bankName}
                            onChange={e => updateBankAccount(ba.id!, 'bankName', e.target.value)}
                            placeholder="Bank Name"
                            className="font-medium px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={ba.branchName}
                            onChange={e => updateBankAccount(ba.id!, 'branchName', e.target.value)}
                            placeholder="Branch"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={ba.accountNumber}
                            onChange={e => updateBankAccount(ba.id!, 'accountNumber', e.target.value)}
                            placeholder="Account #"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={ba.iban}
                            onChange={e => updateBankAccount(ba.id!, 'iban', e.target.value)}
                            placeholder="IBAN"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removeBankAccount(ba.id!)}
                        className="ml-4 text-red-600 hover:text-red-800"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div>
            {customer && onDelete && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                Delete Customer
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {saving ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
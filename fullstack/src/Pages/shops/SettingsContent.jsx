const SettingsContent = () => {
  // Initial formData state for shop details
  const [formData, setFormData] = useState({
    shopName: shopData?.name || '',
    email: shopData?.email || '',
    phone: shopData?.phone || '',
    ownerName: shopData?.owner_name || '',
    address: shopData?.address || '',
    description: shopData?.description || ''
  });
  
  // Set up businessHours with default values
  const DAYS_OF_WEEK = [
    { id: 0, name: 'Monday' },
    { id: 1, name: 'Tuesday' },
    { id: 2, name: 'Wednesday' },
    { id: 3, name: 'Thursday' },
    { id: 4, name: 'Friday' },
    { id: 5, name: 'Saturday' },
    { id: 6, name: 'Sunday' },
  ];
  
  // Business hours and special days state
  const [businessHours, setBusinessHours] = useState(
    DAYS_OF_WEEK.map(day => ({
      day_of_week: day.id,
      day_name: day.name,
      opening_time: '09:00',
      closing_time: '17:00',
      is_closed: day.id === 6 // Sunday closed by default
    }))
  );
  const [specialClosingDays, setSpecialClosingDays] = useState([]);
  const [newClosingDay, setNewClosingDay] = useState({ date: '', reason: '' });
  
  // UI state for settings
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch business hours and special closing days
  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        const token = localStorage.getItem("shop_access_token");
        if (!token) return;
        
        // Example API calls (replace with your actual endpoints)
        const hoursResponse = await fetch("http://127.0.0.1:8000/api/auth/shop/business-hours/", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (hoursResponse.ok) {
          const hoursData = await hoursResponse.json();
          if (hoursData.length > 0) {
            setBusinessHours(hoursData);
          }
        }
        
        const closingDaysResponse = await fetch("http://127.0.0.1:8000/api/auth/shop/special-closing-days/", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (closingDaysResponse.ok) {
          const closingDaysData = await closingDaysResponse.json();
          setSpecialClosingDays(closingDaysData);
        }
      } catch (error) {
        console.error("Error fetching business data:", error);
      }
    };
    
    fetchBusinessData();
  }, []);
  
  // Handle input changes for shop details
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle business hours update
  const handleHoursChange = (index, field, value) => {
    const updatedHours = [...businessHours];
    
    if (field === 'is_closed') {
      updatedHours[index].is_closed = value;
    } else {
      updatedHours[index][field] = value;
    }
    
    setBusinessHours(updatedHours);
  };
  
  // Save business hours
  const handleSaveHours = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("shop_access_token");
      if (!token) throw new Error("Not authenticated");
      
      const response = await fetch("http://127.0.0.1:8000/api/auth/shop/business-hours/update/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ business_hours: businessHours }),
      });
      
      if (response.ok) {
        alert("Business hours updated successfully!");
      } else {
        throw new Error("Failed to update business hours");
      }
    } catch (error) {
      console.error("Error saving business hours:", error);
      alert("Failed to save business hours: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle new closing day input changes
  const handleClosingDayChange = (field, value) => {
    setNewClosingDay(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Add special closing day
  const handleAddClosingDay = async () => {
    if (!newClosingDay.date) {
      alert("Please select a date");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("shop_access_token");
      if (!token) throw new Error("Not authenticated");
      
      const response = await fetch("http://127.0.0.1:8000/api/auth/shop/special-closing-days/add/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newClosingDay),
      });
      
      if (response.ok) {
        const result = await response.json();
        setSpecialClosingDays([
          ...specialClosingDays,
          {
            id: result.id,
            date: newClosingDay.date,
            reason: newClosingDay.reason
          }
        ]);
        setNewClosingDay({ date: '', reason: '' });
        alert("Special closing day added successfully!");
      } else {
        throw new Error("Failed to add special closing day");
      }
    } catch (error) {
      console.error("Error adding special closing day:", error);
      alert("Failed to add special closing day: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Remove special closing day
  const handleRemoveClosingDay = async (id) => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("shop_access_token");
      if (!token) throw new Error("Not authenticated");
      
      const response = await fetch(`http://127.0.0.1:8000/api/auth/shop/special-closing-days/remove/${id}/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setSpecialClosingDays(specialClosingDays.filter(day => day.id !== id));
        alert("Special closing day removed successfully!");
      } else {
        throw new Error("Failed to remove special closing day");
      }
    } catch (error) {
      console.error("Error removing special closing day:", error);
      alert("Failed to remove special closing day: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Shop Details Section */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Shop Details</h3>
        
        {!isApproved && <ApprovalPendingNotice />}
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="shopName">Shop Name</label>
              <input 
                type="text" 
                id="shopName"
                name="shopName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.shopName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">Email Address</label>
              <input 
                type="email" 
                id="email"
                name="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                value={formData.email}
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="phone">Phone Number</label>
              <input 
                type="tel" 
                id="phone"
                name="phone"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="ownerName">Owner Name</label>
              <input 
                type="text" 
                id="ownerName"
                name="ownerName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.ownerName}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="address">Shop Address</label>
            <textarea 
              id="address"
              name="address"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              value={formData.address}
              onChange={handleInputChange}
              required
            ></textarea>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">Shop Description</label>
            <textarea 
              id="description"
              name="description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
              required
            ></textarea>
          </div>
          
          <div className="flex justify-end">
            <button 
              onClick={handleSaveSettings}
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:bg-blue-300"
            >
              <div className="flex items-center">
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Saving...' : 'Save Shop Details'}
              </div>
            </button>
          </div>
        </div>
      </div>
      
      {/* Business Hours Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Business Hours</h3>
          <button 
            onClick={handleSaveHours}
            disabled={isSubmitting}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:bg-blue-300"
          >
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Hours'}
            </div>
          </button>
        </div>
        
        <div className="space-y-4">
          {businessHours.map((day, index) => (
            <div 
              key={day.day_of_week} 
              className="grid grid-cols-12 gap-4 items-center py-2 border-b border-gray-100 last:border-b-0"
            >
              <div className="col-span-3 font-medium">{day.day_name}</div>
              
              <div className="col-span-8 grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="time"
                    value={day.opening_time || '09:00'}
                    onChange={(e) => handleHoursChange(index, 'opening_time', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={day.is_closed}
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="time"
                    value={day.closing_time || '17:00'}
                    onChange={(e) => handleHoursChange(index, 'closing_time', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={day.is_closed}
                  />
                </div>
              </div>
              
              <div className="col-span-1 flex items-center justify-end">
                <input
                  type="checkbox"
                  id={`closed-${day.day_of_week}`}
                  checked={day.is_closed}
                  onChange={(e) => handleHoursChange(index, 'is_closed', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`closed-${day.day_of_week}`} className="ml-2 text-sm text-gray-700">
                  Closed
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Special Closing Days Section */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Special Closing Days</h3>
        
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="closingDate">
              Date
            </label>
            <input
              type="date"
              id="closingDate"
              value={newClosingDay.date}
              onChange={(e) => handleClosingDayChange('date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="closingReason">
              Reason (Optional)
            </label>
            <input
              type="text"
              id="closingReason"
              value={newClosingDay.reason}
              onChange={(e) => handleClosingDayChange('reason', e.target.value)}
              placeholder="e.g., Holiday, Maintenance"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <button
              onClick={handleAddClosingDay}
              disabled={isSubmitting || !newClosingDay.date}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:bg-blue-300"
            >
              <div className="flex items-center justify-center">
                <Calendar className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Adding...' : 'Add Closing Day'}
              </div>
            </button>
          </div>
        </div>
        
        {specialClosingDays.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {specialClosingDays.map((day) => (
                  <tr key={day.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(day.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {day.reason || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRemoveClosingDay(day.id)}
                        disabled={isSubmitting}
                        className="text-red-600 hover:text-red-900 disabled:text-red-300"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            No special closing days added yet.
          </div>
        )}
      </div>
    </div>
  );
};
import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Camera, MapPin, FileText, AlertTriangle, Car, Image as ImageIcon, Store, CheckCircle, UploadCloud } from 'lucide-react';

export default function ReportViolation() {
  const [reportType, setReportType] = useState('parking'); // 'parking' | 'hawker'
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Car');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef(null);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) {
      toast.error('Location is required.');
      return;
    }
    if (reportType === 'parking' && !vehicleNumber) {
      toast.error('Vehicle Number is highly required for parking violations.');
      return;
    }
    if (!photo) {
      toast.error('Please upload a photo as proof of the violation.');
      return;
    }

    setLoading(true);
    
    try {
      const endpoint = reportType === 'parking' 
        ? '/api/illegal-parking/citizen-report' 
        : '/api/encroachments/citizen-report';
        
      const payload = {
         location,
         vehicleNumber,
         vehicleType,
         description
      };
      
      await fetch(endpoint, {
        method: 'POST',
        headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      
      toast.success('Your report has been successfully submitted to the Municipal Authorities!');
      setVehicleNumber('');
      setLocation('');
      setDescription('');
      setPhoto(null);
      setPreviewUrl('');
    } catch (err) {
      toast.error('Failed to submit report. Please check server connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 bg-white shadow-xl border border-gray-100 rounded-3xl" style={{ animation: 'fade-in 0.4s ease-out' }}>
      
      {/* Header Section */}
      <div className="flex items-center gap-4 border-b border-gray-100 pb-6 mb-8">
        <div className="bg-red-100 p-4 rounded-full flex items-center justify-center shadow-inner">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <div>
          <h2 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">Report a Violation</h2>
          <p className="text-gray-500 font-medium mt-1">Help keep Solapur safe by reporting illegal parking or unauthorized hawker encroachments.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Violation Type Toggle */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            onClick={() => setReportType('parking')}
            className={`cursor-pointer border-2 rounded-2xl p-5 flex items-start gap-4 transition-all ${
              reportType === 'parking' 
                ? 'border-red-500 bg-red-50/50 shadow-md' 
                : 'border-gray-200 hover:border-red-200 hover:bg-gray-50'
            }`}
          >
            <div className={`p-3 rounded-full ${reportType === 'parking' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Car className="w-6 h-6" />
            </div>
            <div>
               <h3 className={`font-bold text-lg ${reportType === 'parking' ? 'text-red-700' : 'text-gray-700'}`}>Illegal Parking</h3>
               <p className="text-xs text-gray-500 font-medium mt-1">Report a vehicle blocking traffic, footpaths, or parked illegally.</p>
            </div>
            {reportType === 'parking' && <CheckCircle className="w-6 h-6 text-red-500 ml-auto self-center" />}
          </div>

          <div 
            onClick={() => setReportType('hawker')}
            className={`cursor-pointer border-2 rounded-2xl p-5 flex items-start gap-4 transition-all ${
              reportType === 'hawker' 
                ? 'border-orange-500 bg-orange-50/50 shadow-md' 
                : 'border-gray-200 hover:border-orange-200 hover:bg-gray-50'
            }`}
          >
            <div className={`p-3 rounded-full ${reportType === 'hawker' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Store className="w-6 h-6" />
            </div>
            <div>
               <h3 className={`font-bold text-lg ${reportType === 'hawker' ? 'text-orange-700' : 'text-gray-700'}`}>Hawker Encroachment</h3>
               <p className="text-xs text-gray-500 font-medium mt-1">Report unauthorized stalls or hawkers blocking public access paths.</p>
            </div>
            {reportType === 'hawker' && <CheckCircle className="w-6 h-6 text-orange-500 ml-auto self-center" />}
          </div>
        </div>

        {/* Dynamic Form Content */}
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column: Details */}
            <div className="space-y-5">
              
              {reportType === 'parking' && (
                 <>
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Vehicle Registration Number *</label>
                     <div className="relative">
                       <input 
                         type="text" 
                         value={vehicleNumber}
                         onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                         placeholder="e.g. MH-13-AB-1234"
                         className="w-full bg-white border border-gray-300 text-[#0F172A] rounded-xl pl-4 pr-10 py-3 font-semibold focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none uppercase placeholder-gray-400"
                       />
                       <Car className="w-5 h-5 text-gray-400 absolute right-3 top-3.5" />
                     </div>
                   </div>

                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Vehicle Type</label>
                     <select 
                       value={vehicleType}
                       onChange={(e) => setVehicleType(e.target.value)}
                       className="w-full bg-white border border-gray-300 text-[#0F172A] rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none appearance-none"
                     >
                       <option>Car</option>
                       <option>Motorcycle / Bike</option>
                       <option>Commercial Truck / Van</option>
                       <option>Auto Rickshaw</option>
                       <option>Other</option>
                     </select>
                   </div>
                 </>
              )}

              {reportType === 'hawker' && (
                 <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Stand/Stall Details (Optional)</label>
                   <input 
                     type="text" 
                     value={vehicleNumber}
                     onChange={(e) => setVehicleNumber(e.target.value)}
                     placeholder="e.g. Fruit cart, food truck (If applicable)"
                     className="w-full bg-white border border-gray-300 text-[#0F172A] rounded-xl px-4 py-3 font-semibold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none placeholder-gray-400"
                   />
                 </div>
              )}

              <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Location / Area *</label>
                 <div className="relative">
                   <input 
                     type="text" 
                     value={location}
                     onChange={(e) => setLocation(e.target.value)}
                     placeholder="Enter exact street or landmark"
                     className="w-full bg-white border border-gray-300 text-[#0F172A] rounded-xl pl-10 pr-4 py-3 font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder-gray-400"
                   />
                   <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                 </div>
              </div>

              <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Additional Description</label>
                 <textarea 
                   value={description}
                   onChange={(e) => setDescription(e.target.value)}
                   placeholder="Briefly describe the violation and how it forms an obstruction..."
                   rows="3"
                   className="w-full bg-white border border-gray-300 text-[#0F172A] rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder-gray-400 resize-none"
                 ></textarea>
              </div>

            </div>

            {/* Right Column: Photo Upload */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                <span>Proof Upload *</span>
                {photo && <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Attached</span>}
              </label>
              
              <div 
                className={`relative w-full h-full min-h-[300px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all group ${
                  photo ? 'border-green-400 bg-white' : 'border-gray-300 bg-gray-100 hover:bg-gray-200 hover:border-gray-400 cursor-pointer'
                }`}
                onClick={() => !photo && fileInputRef.current.click()}
              >
                {photo ? (
                  <>
                    <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover z-0" />
                    <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <button type="button" onClick={() => {setPhoto(null); setPreviewUrl('');}} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 hover:bg-red-600 active:scale-95">
                         Remove Photo
                       </button>
                    </div>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-16 h-16 text-gray-400 mb-3" />
                    <p className="text-[#0F172A] font-bold">Click to upload photo</p>
                    <p className="text-gray-500 text-sm mt-1">JPEG, PNG, JPG accepted</p>
                  </>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>

          </div>

        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            disabled={loading}
            className={`px-10 py-4 rounded-xl font-black text-white text-lg tracking-wide shadow-lg hover:shadow-xl transition-all transform active:scale-95 flex items-center gap-3 ${
              reportType === 'hawker' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading ? (
               <>
                 <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 Uploading...
               </>
            ) : (
              <>
                <FileText className="w-6 h-6" />
                Submit Official Report
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}

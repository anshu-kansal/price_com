import React, { useState, useEffect, useRef } from 'react';
import { Camera, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import './Scanner.css'; // Optional: If you want to use external CSS styles easily

const Scanner = ({ onScanComplete }) => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [preview, setPreview] = useState(null);

    // Scanning state
    const [isScanning, setIsScanning] = useState(false);
    const [scanStatusText, setScanStatusText] = useState('');
    const [error, setError] = useState(null);

    const fileInputRef = useRef(null);

    // Simulated AI Status text progression
    useEffect(() => {
        let timers = [];
        if (isScanning) {
            setScanStatusText('Initializing Vision Model...');

            timers.push(setTimeout(() => {
                setScanStatusText('Extracting features...');
            }, 800));

            timers.push(setTimeout(() => {
                setScanStatusText('Querying Vector Database...');
            }, 1600));

            timers.push(setTimeout(() => {
                setScanStatusText('Matching with database...');
            }, 2400));
        }

        return () => timers.forEach(clearTimeout);
    }, [isScanning]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Professional Validation: Restrict to images only
        if (!file.type.startsWith('image/')) {
            setError('Invalid file format. Please upload a JPG or PNG.');
            return;
        }

        // Reset states
        setError(null);
        setSelectedImage(file);

        // Create preview URL instantly for UX
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const startScan = async () => {
        if (!selectedImage) return;

        setIsScanning(true);
        setError(null);

        const formData = new FormData();
        formData.append('image', selectedImage);

        try {
            // Send the image to the Mock Django Endpoint
            const response = await api.post('/products/scan/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data && response.data.status === 'success') {
                // Success Path - Provide the resolved payload back to the parent component
                // or handle navigation directly here
                if (onScanComplete) {
                    onScanComplete(response.data.data);
                }
            }
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message || 'Error occurred during scan.';
            setError(errorMsg);
        } finally {
            setIsScanning(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (isScanning) return;

        const file = e.dataTransfer.files[0];
        if (file) {
            handleImageChange({ target: { files: [file] } });
        }
    };

    const triggerFileInput = () => {
        if (isScanning) return;
        fileInputRef.current.click();
    };

    return (
        <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center justify-center gap-2">
                    <Camera className="w-6 h-6 text-indigo-600" />
                    Intelligent Scanner
                </h2>
                <p className="text-gray-500 mt-2 text-sm">Upload an image of a product to find direct price matches across stores.</p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Upload & Preview Area */}
            <div
                className={`relative group rounded-xl border-2 border-dashed transition-all duration-300 overflow-hidden cursor-pointer
          ${selectedImage ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}
          ${isScanning ? 'pointer-events-none opacity-90' : ''}
        `}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={triggerFileInput}
            >
                <div className="w-full h-64 flex flex-col items-center justify-center p-6 relative z-10">
                    {preview ? (
                        <div className="absolute inset-0 w-full h-full p-2">
                            <img
                                src={preview}
                                alt="Preview"
                                className={`w-full h-full object-contain rounded-lg transition-transform duration-700 
                        ${isScanning ? 'scale-105 opacity-80 filter brightness-110 contrast-125' : ''}
                    `}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-gray-400 group-hover:text-indigo-500 transition-colors">
                            <ImageIcon className="w-12 h-12 mb-3 opacity-50" />
                            <span className="font-medium text-gray-600">Drag & Drop or Click to Upload</span>
                            <span className="text-xs text-gray-400 mt-1">Supports JPG, PNG (Max 5MB)</span>
                        </div>
                    )}
                </div>

                {/* Hidden Scanning Overlay Animation Native mapping */}
                {isScanning && (
                    <div className="absolute inset-0 pointer-events-none z-20">
                        <div className="w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] absolute top-0 left-0 animate-[scan_2s_ease-in-out_infinite_alternate]"></div>
                        <div className="absolute inset-0 bg-indigo-600/10 animate-pulse"></div>
                    </div>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/jpeg, image/png, image/webp"
                    className="hidden"
                />
            </div>

            {/* Action Area */}
            <div className="mt-6 flex flex-col items-center">
                {isScanning ? (
                    <div className="flex flex-col items-center w-full">
                        <div className="flex items-center gap-3 text-indigo-600 font-medium tracking-wide">
                            <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {scanStatusText}
                        </div>

                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-4 overflow-hidden">
                            <div className="bg-indigo-600 h-1.5 rounded-full w-0 transition-all duration-[800ms] ease-out"
                                style={{ width: scanStatusText.includes('database') ? '90%' : scanStatusText.includes('features') ? '50%' : '15%' }}>
                            </div>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={startScan}
                        disabled={!selectedImage}
                        className={`w-full py-3 px-6 rounded-xl font-medium tracking-wide transition-all shadow-sm flex items-center justify-center gap-2
              ${selectedImage
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-md hover:-translate-y-0.5'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                            }
            `}
                    >
                        {selectedImage ? (
                            <>
                                <CheckCircle2 className="w-5 h-5" /> Execute Image Recognition
                            </>
                        ) : 'Select an image first'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default Scanner;

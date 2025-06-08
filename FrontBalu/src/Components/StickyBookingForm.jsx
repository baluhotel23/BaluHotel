import React, { useState, useEffect } from 'react';
import BookingSearchForm from './Booking/BookingSearchForm';
import { useLocation } from 'react-router-dom';

const StickyBookingForm = () => {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();
  
  // Only show on home page
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    if (!isHomePage) return;

    const handleScroll = () => {
      // Show the sticky form when user scrolls past the header (around 70vh)
      const scrolled = window.scrollY;
      const triggerPoint = window.innerHeight * 0.7;
      
      setIsVisible(scrolled > triggerPoint);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  if (!isHomePage) return null;

  return (
    <div 
      className={`fixed top-16 left-0 right-0 z-40 transform transition-all duration-500 ease-in-out ${
        isVisible 
          ? 'translate-y-0 opacity-100' 
          : '-translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="bg-white bg-opacity-95 backdrop-blur-sm shadow-lg border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          {/* Compact version of BookingSearchForm */}
          <div className="max-w-5xl mx-auto">
            <BookingSearchForm isCompact={true} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickyBookingForm;

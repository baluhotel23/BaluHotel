// eslint-disable-next-line no-unused-vars
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header'
import HotelShowcase from './HotelShowcase'
import StickyBookingForm from './StickyBookingForm'
import RoomsShowcase from './RoomsShowcase'
import ActivitiesShowcase from './ActivitiesShowcase';
import ReviewsShowcase from './ReviewsShowcase';
import ContactSection from './ContactSection';
import Footer from './Footer';



const Landing = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location.hash]); // Re-run effect when hash changes

  return (
    <div>
      <Header />
      <StickyBookingForm />
      <HotelShowcase />
      <div id="room-showcase"> {/* Added id for section navigation */}
        <RoomsShowcase />
      </div>
      <div id="activities-showcase"> {/* Added id for section navigation */}
        <ActivitiesShowcase />
      </div>
      <ReviewsShowcase />
      <div id="contact-section"> {/* Added id for section navigation */}
        <ContactSection />
      </div>
      <Footer />
      
    </div>
  )
}

export default Landing
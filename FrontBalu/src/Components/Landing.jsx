// eslint-disable-next-line no-unused-vars
import React from 'react'
import Header from './Header'
import HotelShowcase from './HotelShowcase'
import StickyBookingForm from './StickyBookingForm'
import RoomsShowcase from './RoomsShowcase'
import ActivitiesShowcase from './ActivitiesShowcase';
import ReviewsShowcase from './ReviewsShowcase';
import ContactSection from './ContactSection';
import Footer from './Footer';



const Landing = () => {
  return (
    <div>
      <Header />
      <StickyBookingForm />
      <HotelShowcase />
      <RoomsShowcase />
      <ActivitiesShowcase />
      <ReviewsShowcase />
      <ContactSection />
      <Footer />
      
    </div>
  )
}

export default Landing
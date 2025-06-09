// eslint-disable-next-line no-unused-vars
import React from 'react'
import Header from './Header'
import HotelShowcase from './HotelShowcase'
import StickyBookingForm from './StickyBookingForm'
import RoomsShowcase from './RoomsShowcase'
import ActivitiesShowcase from './ActivitiesShowcase'; // Import the new component




const Landing = () => {
  return (
    <div>
      <Header />
      <StickyBookingForm />
      <HotelShowcase />
      <RoomsShowcase />
      <ActivitiesShowcase /> {/* Add the new component here */}
      
    </div>
  )
}

export default Landing
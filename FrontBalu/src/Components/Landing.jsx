// eslint-disable-next-line no-unused-vars
import React from 'react'
import Header from './Header'
import HotelShowcase from './HotelShowcase'
import StickyBookingForm from './StickyBookingForm'
import RoomsShowcase from './RoomsShowcase'




const Landing = () => {
  return (
    <div>
      <Header />
      <StickyBookingForm />
      <HotelShowcase />
      <RoomsShowcase />
      
    </div>
  )
}

export default Landing
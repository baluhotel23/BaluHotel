// eslint-disable-next-line no-unused-vars
import React from 'react'
import Header from './Header'
import HotelShowcase from './HotelShowcase'
import StickyBookingForm from './StickyBookingForm'



const Landing = () => {
  return (
    <div>
      <Header />
      <StickyBookingForm />
      <HotelShowcase />
    </div>
  )
}

export default Landing
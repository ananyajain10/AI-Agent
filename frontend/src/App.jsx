import React from 'react'
import AppRoutes from './routes/AppRoutes'
import { UserProvider } from './context/user.provider.jsx'

const App = () => {
  return (
    <UserProvider>
      <AppRoutes />
    </UserProvider>
  )
}

export default App
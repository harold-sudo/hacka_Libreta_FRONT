import { createBrowserRouter } from 'react-router-dom'
import { Layout } from './Layout'
import { HomePage } from '../pages/HomePage'
import { RouteError } from './RouteError'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteError />,
    children: [{ index: true, element: <HomePage /> }],
  },
])

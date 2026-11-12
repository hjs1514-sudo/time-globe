import { useEffect, useState } from 'react'
import Home from './pages/Home.jsx'
import Explore from './pages/Explore.jsx'
import Student from './pages/Student.jsx'
import Teacher from './pages/Teacher.jsx'

const route = () => (location.hash.replace(/^#\/?/, '').split('?')[0] || 'home')
export default function App() {
  const [r, setR] = useState(route())
  useEffect(() => { const f = () => setR(route()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  if (r === 'explore') return <Explore />
  if (r === 'class') return <Student />
  if (r === 'teacher') return <Teacher />
  return <Home />
}

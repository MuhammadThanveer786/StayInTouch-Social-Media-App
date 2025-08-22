import React from 'react'
import { assets } from '../assets/assets'
import { Star } from 'lucide-react'
import { SignIn } from '@clerk/clerk-react'
import { motion } from 'framer-motion'

const Login = () => {
  return (
    <div className='min-h-screen flex flex-col md:flex-row'>

      <img src={assets.bgImage} alt="" className='absolute top-0 left-0 -z-1 w-full h-full object-cover' />
      
      <div className='flex-1 flex flex-col items-start  justify-between p-6 md:p-10 lg:pl-40'>
        <motion.img 
          src="logo2.png" 
          alt="" 
          className='h-14 md:h-18 object-contain'
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        />
        <div>
          <div className='flex items-center gap-3 mb-4 max-md:mt-10'>
            <motion.img 
              src={assets.group_users} 
              alt="" 
              className='h-8 md:h-10'
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
            />
            <div>
              <motion.div 
                className='flex'
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1, transition: { staggerChildren: 0.15 } }
                }}
              >
               {Array(5).fill(0).map((_,i)=>(
                 <motion.div 
                   key={i}
                   variants={{ hidden: { opacity: 0, scale: 0.8 }, show: { opacity: 1, scale: 1 } }}
                 >
                   <Star className='size-4 md:size-4.5 text-transparent fill-amber-500'/>
                 </motion.div>
               ))}
              </motion.div>
              <p>Used by 12k+ developers</p>
            </div>
          </div>

          <motion.h1 
            className="text-3xl md:text-6xl md:pb-2 font-bold text-indigo-900"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
          >
            More than friends, Real connections.
          </motion.h1>
           
          <motion.p 
            className='text-xl md:text-3xl text-indigo-900 max-w-72 md:max-w-md'
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            connect with global community on StayInTouch.
          </motion.p>
        </div>
        <span className='md:h-10'></span>
      </div>
{/* Sign In Box with right-to-left animation */}
<motion.div 
  className='flex-1 flex items-center justify-center p-6 sm:p-10'
  initial={{ opacity: 0, x: 100 }}   // start from right
  animate={{ opacity: 1, x: 0 }}     // slide to center
  transition={{ duration: 0.8, ease: "easeOut" }}
>
  <SignIn />
</motion.div>

    </div>
  )
}

export default Login

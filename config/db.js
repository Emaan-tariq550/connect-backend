import mongoose from 'mongoose'

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, { family: 4 })
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
  } catch (err) {
    console.error(`❌ MongoDB Error: ${err.message}`)
  }
}

mongoose.connection.on('disconnected', () => console.warn('⚠️ MongoDB disconnected'))
mongoose.connection.on('reconnected', () => console.log('✅ MongoDB reconnected'))

export default connectDB
import { Star, MapPin } from "lucide-react"

// Simple Card component to replace shadcn/ui
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${className}`}>{children}</div>
)

const CardContent = ({ children, className = "" }) => <div className={`p-4 ${className}`}>{children}</div>

// Simple Button component
const Button = ({ children, className = "", ...props }) => (
  <button
    className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 ${className}`}
    {...props}
  >
    {children}
  </button>
)

/**
 * @typedef {Object} Barber
 * @property {number} id
 * @property {string} name
 * @property {string} location
 * @property {number} rating
 * @property {number} reviews
 * @property {string} price
 * @property {string} image
 */

/**
 * @param {Object} props
 * @param {Barber} props.barber
 */
export default function BarberCard({ barber }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="relative h-64 w-full">
        <img
          src={barber.image || "https://via.placeholder.com/300"}
          alt={barber.name}
          className="w-full h-full object-cover"
        />
      </div>
      <CardContent className="p-4">
        <h3 className="font-bold text-lg">{barber.name}</h3>

        <div className="flex items-center mt-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4 mr-1" />
          <span>{barber.location}</span>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500 mr-1" />
            <span className="font-medium">{barber.rating}</span>
            <span className="text-gray-500 text-sm ml-1">({barber.reviews})</span>
          </div>
          <div className="text-sm font-medium">{barber.price}</div>
        </div>

        <Button className="w-full mt-4">Book Now</Button>
      </CardContent>
    </Card>
  )
}

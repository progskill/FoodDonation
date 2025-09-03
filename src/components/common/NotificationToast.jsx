import { useEffect } from 'react'
import { useNotification } from '../../contexts/NotificationContext'

const NotificationToast = () => {
  const { notifications, removeNotification } = useNotification()

  return (
    <div className="fixed top-4 right-4 z-50 space-y-4">
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  )
}

const NotificationCard = ({ notification, onClose }) => {
  useEffect(() => {
    if (notification.duration !== 0) {
      const timer = setTimeout(() => {
        onClose()
      }, notification.duration || 5000)
      
      return () => clearTimeout(timer)
    }
  }, [notification.duration, onClose])

  const getIconAndColors = (type) => {
    switch (type) {
      case 'success':
        return {
          icon: '✅',
          bgColor: 'bg-success-50',
          borderColor: 'border-success-200',
          textColor: 'text-success-800',
          iconColor: 'text-success-600'
        }
      case 'error':
        return {
          icon: '❌',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-600'
        }
      case 'info':
        return {
          icon: 'ℹ️',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600'
        }
      default:
        return {
          icon: 'ℹ️',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
          iconColor: 'text-gray-600'
        }
    }
  }

  const { icon, bgColor, borderColor, textColor, iconColor } = getIconAndColors(notification.type)

  return (
    <div className={`max-w-sm w-full ${bgColor} border ${borderColor} rounded-lg shadow-lg p-4 transition-all duration-300 transform hover:scale-105`}>
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${iconColor} mr-3`}>
          <span className="text-lg">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div>
              <h4 className={`text-sm font-medium ${textColor} mb-1`}>
                {notification.title}
              </h4>
              <p className={`text-sm ${textColor} opacity-90`}>
                {notification.message}
              </p>
            </div>
            <button
              onClick={onClose}
              className={`flex-shrink-0 ml-2 ${textColor} hover:opacity-75 text-lg leading-none`}
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationToast
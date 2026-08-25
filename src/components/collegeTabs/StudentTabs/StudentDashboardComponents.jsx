import React, { useState, useEffect } from "react";



import { NavLink, useNavigate } from "react-router-dom";



import { Book, ChevronRight, Clock, User, ChevronDown, Home, Search, Heart, Mail, History as ClockIcon, Settings, LogOut, Plus, X, Menu, Bell, CheckCircle, MapPin } from "lucide-react";



import { useNotifications } from "../../../context/NotificationContext";



import api from "../../../utils/api";







const navigation = [



  {



    name: "Home",



    path: "/studentpage",



    icon: "/home-button.png",



    mobileIcon: Home,



    primary: true,



  },



  {



    name: "Search",



    path: "/studentpage/search",



    icon: "/search.png",



    mobileIcon: Search,



    primary: true,



  },



  {



    name: "Favorites",



    path: "/studentpage/favorites",



    icon: "/heart.png",



    mobileIcon: Heart,



    primary: false,



  },



  {



    name: "Inbox",



    path: "/studentpage/inbox",



    icon: "/email.png",



    mobileIcon: Mail,



    primary: true,



  },



  {



    name: "History",



    path: "/studentpage/history",



    icon: "/history.png",



    mobileIcon: ClockIcon,



    primary: true,



  },



  {



    name: "Profile",



    path: "/studentpage/profile",



    icon: "/user.png",



    mobileIcon: User,



    primary: false,



  },



  {



    name: "Settings",



    path: "/studentpage/settings",



    icon: "/settings.png",



    mobileIcon: Settings,



    primary: false,



  },



];







export function StudentBottomNav() {

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);



  const primaryNav = navigation.filter(item => item.primary);

  const secondaryNav = navigation.filter(item => !item.primary);



  return (

    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] z-50">

      <div className="flex items-center justify-around h-16 px-2">

        {/* Home */}

        <NavLink

          to="/studentpage"

          end

          className={({ isActive }) => `

            flex flex-col items-center gap-1 py-2 px-3 transition-all

            ${isActive ? 'text-[#2563EB]' : 'text-gray-400'}

          `}

        >

          <Home className="w-6 h-6" />

          <span className="text-[10px] font-medium">Home</span>

        </NavLink>



        {/* Search */}

        <NavLink

          to="/studentpage/search"

          className={({ isActive }) => `

            flex flex-col items-center gap-1 py-2 px-3 transition-all

            ${isActive ? 'text-[#2563EB]' : 'text-gray-400'}

          `}

        >

          <Search className="w-6 h-6" />

          <span className="text-[10px] font-medium">Search</span>

        </NavLink>



        {/* Add - Center button */}

        <button

          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}

          className="flex items-center justify-center w-14 h-14 -mt-6 rounded-full bg-[#2563EB] shadow-[0_4px_20px_rgba(37,99,235,0.4)] border-4 border-white transition-transform hover:scale-105 active:scale-95"

        >

          <Plus className="w-7 h-7 text-white" />

        </button>



        {/* Inbox */}

        <NavLink

          to="/studentpage/inbox"

          className={({ isActive }) => `

            flex flex-col items-center gap-1 py-2 px-3 transition-all

            ${isActive ? 'text-[#2563EB]' : 'text-gray-400'}

          `}

        >

          <Mail className="w-6 h-6" />

          <span className="text-[10px] font-medium">Inbox</span>

        </NavLink>



        {/* History */}

        <NavLink

          to="/studentpage/history"

          className={({ isActive }) => `

            flex flex-col items-center gap-1 py-2 px-3 transition-all

            ${isActive ? 'text-[#2563EB]' : 'text-gray-400'}

          `}

        >

          <ClockIcon className="w-6 h-6" />

          <span className="text-[10px] font-medium">History</span>

        </NavLink>



        {/* Plus Menu Dropdown */}

        {mobileMenuOpen && (

          <div className="fixed bottom-20 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">

            <div className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] px-4 py-3">

              <p className="text-white font-semibold text-sm">More Options</p>

            </div>

            {secondaryNav.map((item) => (

              <NavLink

                key={item.name}

                to={item.path}

                onClick={() => setMobileMenuOpen(false)}

                className="flex items-center gap-3 px-4 py-3.5 text-sm text-slate-700 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"

              >

                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">

                  <item.mobileIcon className="w-4 h-4 text-blue-600" />

                </div>

                <span className="font-medium">{item.name}</span>

              </NavLink>

            ))}

          </div>

        )}

      </div>

    </nav>

  );

}



export function StudentBottomDock() {



  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);







  const primaryNav = navigation.filter(item => item.primary);



  const secondaryNav = navigation.filter(item => !item.primary);







  return (



    <nav



      className="



        fixed



        bottom-4



        left-1/2



        -translate-x-1/2



        z-[1000]







        w-[calc(100%-32px)]



        max-w-[360px]



        md:w-auto



        md:max-w-none



        md:bottom-6







        flex



        items-center



        gap-1







        px-2.5



        py-2







        rounded-full







        md:bg-[#2D8AC4]/70



        md:backdrop-blur-xl



        md:border



        md:border-white/25



        md:shadow-[0_10px_30px_rgba(0,0,0,0.15)]







        bg-white



        shadow-[0_8px_32px_rgba(0,0,0,0.12)]



        border border-gray-100







        select-none



      "



      aria-label="Student Navigation"



    >



      {/* Desktop: Show all icons */}



      <div className="hidden md:flex items-center gap-1">



        {navigation.map((item) => (



          <DockItem key={item.name} item={item} />



        ))}



      </div>







      {/* Mobile: Floating white pill with 5 items */}



      <div className="flex md:hidden items-center justify-between w-full px-2">



        {/* Home */}



        <NavLink



          to="/studentpage"



          end



          className={({ isActive }) => `



            flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all



            ${isActive ? 'text-[#2563EB]' : 'text-gray-400'}



          `}



        >



          <Home className="w-5 h-5" />



          <span className="text-[10px] font-medium">Home</span>



        </NavLink>







        {/* Search */}



        <NavLink



          to="/studentpage/search"



          className={({ isActive }) => `



            flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all



            ${isActive ? 'text-[#2563EB]' : 'text-gray-400'}



          `}



        >



          <Search className="w-5 h-5" />



          <span className="text-[10px] font-medium">Search</span>



        </NavLink>







        {/* Add - Large elevated blue circular button */}



        <button



          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}



          className="



            -mt-6



            flex items-center justify-center



            w-14 h-14



            rounded-full



            bg-[#2563EB]



            shadow-[0_4px_20px_rgba(37,99,235,0.4)]



            border-4 border-white



            transition-transform



            hover:scale-105



            active:scale-95



          "



        >



          <Plus className="w-7 h-7 text-white" />



        </button>







        {/* Inbox */}



        <NavLink



          to="/studentpage/inbox"



          className={({ isActive }) => `



            flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all



            ${isActive ? 'text-[#2563EB]' : 'text-gray-400'}



          `}



        >



          <Mail className="w-5 h-5" />



          <span className="text-[10px] font-medium">Inbox</span>



        </NavLink>







        {/* History */}



        <NavLink



          to="/studentpage/history"



          className={({ isActive }) => `



            flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all



            ${isActive ? 'text-[#2563EB]' : 'text-gray-400'}



          `}



        >



          <ClockIcon className="w-5 h-5" />



          <span className="text-[10px] font-medium">History</span>



        </NavLink>







        {/* Plus Menu - Improved Dropdown */}

        {mobileMenuOpen && (

          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-56 rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">

            <div className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] px-4 py-3">

              <p className="text-white font-semibold text-sm">More Options</p>

            </div>

            {secondaryNav.map((item) => (

              <NavLink

                key={item.name}

                to={item.path}

                onClick={() => setMobileMenuOpen(false)}

                className="flex items-center gap-3 px-4 py-3.5 text-sm text-slate-700 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"

              >

                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">

                  <item.mobileIcon className="w-4 h-4 text-blue-600" />

                </div>

                <span className="font-medium">{item.name}</span>

              </NavLink>

            ))}

          </div>

        )}



      </div>



    </nav>



  );



}







function DockItem({ item }) {



  const [hovered, setHovered] = useState(false);



  const MobileIcon = item.mobileIcon;







  return (



    <NavLink



      to={item.path}



      end={item.path === "/studentpage"}



      className="relative"



      onMouseEnter={() => setHovered(true)}



      onMouseLeave={() => setHovered(false)}



    >



      {({ isActive }) => (



        <div className="relative flex items-center justify-center">



          {/* Desktop PNG Icon */}



          <div className="hidden md:flex items-center justify-center w-12 h-12">



            <img



              src={item.icon}



              alt={item.name}



              draggable="false"



              className={`



                w-8



                h-8



                object-contain







                transition-opacity



                duration-200



                ease-out







                ${isActive ? 'opacity-100' : hovered ? 'opacity-75' : 'opacity-50'}



              `}



            />



          </div>







          {/* Mobile SVG Icon */}



          <div className="flex md:hidden items-center justify-center w-11 h-11">



            <MobileIcon



              className={`



                w-6



                h-6



                text-slate-800







                transition-opacity



                duration-200



                ease-out







                ${isActive ? 'opacity-100' : hovered ? 'opacity-75' : 'opacity-50'}



              `}



            />



          </div>







          {/* Active Dot Indicator */}



          {isActive && (



            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#2563EB]" />



          )}







          {/* Desktop Tooltip */}



          {hovered && (



            <div className="hidden md:block absolute bottom-full left-1/2 -translate-x-1/2 mb-3 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg whitespace-nowrap">



              {item.name}



            </div>



          )}



        </div>



      )}



    </NavLink>



  );



}







export function StudentHeader({ userInfo, onLogout }) {



  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);



  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);



  const [notificationFilter, setNotificationFilter] = useState('all');



  const [searchQuery, setSearchQuery] = useState('');



  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);



  const [books, setBooks] = useState([]);



  const [filteredBooks, setFilteredBooks] = useState([]);



  const { unreadCount, notifications, markAsRead } = useNotifications();



  const navigate = useNavigate();







  // Load books on mount



  useEffect(() => {



    const loadBooks = async () => {



      const schoolId = localStorage.getItem('schoolId');



      if (!schoolId) {



        console.log('No schoolId found in localStorage');



        return;



      }







      try {



        const response = await api.get(`/books/school?school_id=${schoolId}`);



        console.log('Books API response:', response.data);



        if (response.data) {



          const mappedBooks = (response.data || []).map((book) => ({



            id: book.book_id,



            title: book.title || 'Untitled',



            author: book.author || 'Unknown Author',



            category: book.category || 'General',



            available: book.real_time_status === 'available',



            available_copies: book.available_copies || 0,



            total_copies: book.total_copies || 0,



          }));



          console.log('Mapped books:', mappedBooks);



          setBooks(mappedBooks);



        }



      } catch (error) {



        console.error('Unable to load books:', error);



      }



    };







    loadBooks();



  }, []);







  // Filter books based on search query



  useEffect(() => {



    if (searchQuery.length > 0) {



      const filtered = books.filter(book =>



        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||



        book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||



        book.category.toLowerCase().includes(searchQuery.toLowerCase())



      ).slice(0, 5); // Show max 5 results



      setFilteredBooks(filtered);



    } else {



      setFilteredBooks([]);



    }



  }, [searchQuery, books]);







  const displayName = userInfo?.first_name || userInfo?.name || 'Student';



  const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');



  const profileImage = userInfo?.profile_picture || userInfo?.profile_image || currentUser?.profile_picture || currentUser?.profile_image || '';



  const getProfileImageUrl = (picture) => {



    if (!picture) return '';



    if (



      picture.startsWith('http://') ||



      picture.startsWith('https://') ||



      picture.startsWith('data:') ||



      picture.startsWith('blob:')



    ) {



      return picture;



    }



    if (picture.startsWith('/')) return `http://localhost:5000${picture}`;



    return `http://localhost:5000/${picture}`;



  };



  const profileImageUrl = getProfileImageUrl(profileImage);







  const handleProfileClick = () => {



    navigate('/studentpage/profile');



    setProfileDropdownOpen(false);



  };







  const handleSettingsClick = () => {



    navigate('/studentpage/settings');



    setProfileDropdownOpen(false);



  };







  const handleNotificationClick = () => {



    setNotificationDropdownOpen(!notificationDropdownOpen);



    setProfileDropdownOpen(false);



  };







  const handleViewAllNotifications = () => {



    navigate('/studentpage/inbox');



    setNotificationDropdownOpen(false);



  };







  const handleNotificationItemClick = (notification) => {



    markAsRead(notification.id);



    setNotificationDropdownOpen(false);



    navigate('/studentpage/inbox');



  };







  const handleSearch = (e) => {



    if (e.key === 'Enter' && searchQuery.trim()) {



      navigate('/studentpage/search', { state: { query: searchQuery.trim() } });



    }



  };







  const handleSearchButtonClick = () => {



    if (searchQuery.trim()) {



      navigate('/studentpage/search', { state: { query: searchQuery.trim() } });



    }



  };







  const clearSearch = () => {



    setSearchQuery('');



    setShowSearchSuggestions(false);



  };







  const handleSearchFocus = () => {



    if (searchQuery.length > 0) {



      setShowSearchSuggestions(true);



    }



  };







  const handleSearchBlur = () => {



    setTimeout(() => setShowSearchSuggestions(false), 200);



  };







  const handleSuggestionClick = (suggestion) => {



    setSearchQuery(suggestion);



    setShowSearchSuggestions(false);



    navigate('/studentpage/search', { state: { query: suggestion } });



  };







  const handleBookClick = (book) => {



    setSearchQuery(book.title);



    setShowSearchSuggestions(false);



    navigate(`/book/${book.id}`);



  };







  const filteredNotifications = notifications.filter((notification) => {



    if (notificationFilter === 'all') return true;



    if (notificationFilter === 'unread') return !notification.read;



    return notification.type === notificationFilter;



  });







  const getNotificationIcon = (type) => {



    switch (type) {



      case 'BORROW_REQUEST_APPROVED':



        return <CheckCircle className="w-4 h-4 text-green-600" />;



      case 'BORROW_REQUEST_REJECTED':



        return <X className="w-4 h-4 text-red-600" />;



      case 'BORROW_REQUEST_SUBMITTED':



        return <Bell className="w-4 h-4 text-blue-600" />;



      case 'BOOK_READY_FOR_PICKUP':



        return <Clock className="w-4 h-4 text-amber-600" />;



      default:



        return <Bell className="w-4 h-4 text-blue-600" />;



    }



  };







  const getNotificationBgColor = (type) => {



    switch (type) {



      case 'BORROW_REQUEST_APPROVED':



        return 'bg-green-100';



      case 'BORROW_REQUEST_REJECTED':



        return 'bg-red-100';



      case 'BORROW_REQUEST_SUBMITTED':



        return 'bg-blue-100';



      case 'BOOK_READY_FOR_PICKUP':



        return 'bg-amber-100';



      default:



        return 'bg-gray-100';



    }



  };







  return (



    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#E5E7EB] h-[64px] md:h-[76px]">



      <div className="h-full flex items-center px-3 md:px-6">



        {/* Left: Logo */}



        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">



          <div className="h-8 w-8 md:h-10 md:w-10 flex items-center justify-center">



            <img



              src="/L.png"



              alt="Libralink"



              className="h-8 w-8 md:h-10 md:w-10 object-contain"



            />



          </div>



          <h1 className="text-base md:text-xl font-semibold text-[#0F172A] font-['Poppins'] hidden sm:block">LIBRALINK</h1>



        </div>







        {/* Center: Search Bar */}



        <div className="flex-1 flex justify-center px-2 md:px-8">



          <div className="relative w-full max-w-[400px] md:max-w-[600px]">



            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-[#64748B]" />



            <input



              type="text"



              placeholder="Search..."



              value={searchQuery}



              onChange={(e) => {



                setSearchQuery(e.target.value);



                setShowSearchSuggestions(e.target.value.length > 0);



              }}



              onKeyDown={handleSearch}



              onFocus={handleSearchFocus}



              onBlur={handleSearchBlur}



              className="w-full h-[40px] md:h-[52px] pl-10 md:pl-12 pr-20 md:pr-24 rounded-full bg-[#E9E9E5] text-[#0F172A] placeholder-[#64748B] outline-none text-sm md:text-base font-['Poppins'] font-medium focus:ring-2 focus:ring-[#2563EB] focus:ring-opacity-50 transition-all"



            />



            {searchQuery && (



              <button



                onClick={clearSearch}



                className="absolute right-12 md:right-14 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#0F172A] transition-colors"



              >



                <X className="w-4 h-4" />



              </button>



            )}



            <button



              onClick={handleSearchButtonClick}



              className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 p-1.5 md:p-2 bg-[#2563EB] hover:bg-[#1D4ED8] rounded-full transition-colors"



            >



              <Search className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />



            </button>







            {/* Search Suggestions Dropdown */}



            {showSearchSuggestions && (



              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-[#E5E7EB] shadow-lg z-50 overflow-hidden">



                {filteredBooks.length > 0 ? (



                  <div className="p-2">



                    {filteredBooks.map((book) => (



                      <button



                        key={book.id}



                        onClick={() => handleBookClick(book)}



                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#F8FAFC] transition-colors text-left"



                      >



                        <Book className="w-4 h-4 text-[#64748B]" />



                        <div className="flex-1 min-w-0">



                          <p className="text-sm font-medium text-[#0F172A] truncate">{book.title}</p>



                          <p className="text-xs text-[#64748B] truncate">{book.author}</p>



                        </div>



                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${book.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>



                          {book.available ? 'Available' : 'Unavailable'}



                        </span>



                      </button>



                    ))}



                  </div>



                ) : (



                  <div className="p-4">



                    <p className="text-sm text-[#64748B] text-center">No matching books found</p>



                  </div>



                )}



              </div>



            )}



          </div>



        </div>







        {/* Right: Actions */}



        <div className="flex items-center gap-2 md:gap-4">



          {/* Notification */}



          <div className="relative">



            <button



              onClick={handleNotificationClick}



              className="relative p-1.5 md:p-2 hover:bg-[#F8FAFC] rounded-full transition-colors"



            >



              <Bell className="w-5 h-5 md:w-6 md:h-6 text-[#0F172A]" />



              {unreadCount > 0 && (



                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />



              )}



            </button>







            {/* Notification Dropdown */}



            {notificationDropdownOpen && (



              <div className="absolute right-0 mt-2 w-80 md:w-96 rounded-xl bg-white border border-[#E5E7EB] shadow-lg py-2 z-50">



                {/* Header */}



                <div className="px-4 py-2 border-b border-[#E5E7EB]">



                  <p className="text-sm font-semibold text-[#0F172A]">Notifications</p>



                  <p className="text-xs text-[#64748B]">{unreadCount} unread</p>



                </div>







                {/* Filter Buttons */}



                <div className="flex gap-2 px-4 py-2 border-b border-[#E5E7EB]">



                  {['all', 'unread'].map((filter) => (



                    <button



                      key={filter}



                      onClick={() => setNotificationFilter(filter)}



                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${



                        notificationFilter === filter



                          ? 'bg-[#2563EB] text-white'



                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'



                      }`}



                    >



                      {filter.charAt(0).toUpperCase() + filter.slice(1)}



                    </button>



                  ))}



                </div>







                {/* Notification List */}



                <div className="max-h-80 overflow-y-auto">



                  {filteredNotifications.length === 0 ? (



                    <div className="px-4 py-6 text-sm text-[#64748B] text-center">



                      No notifications



                    </div>



                  ) : (



                    filteredNotifications.map((notification) => (



                      <div



                        key={notification.id}



                        onClick={() => handleNotificationItemClick(notification)}



                        className={`px-4 py-3 border-b border-[#E5E7EB] last:border-b-0 hover:bg-[#F8FAFC] cursor-pointer transition-colors ${



                          !notification.read ? 'bg-blue-50' : ''



                        }`}



                      >



                        <div className="flex items-start gap-3">



                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getNotificationBgColor(notification.type)}`}>



                            {getNotificationIcon(notification.type)}



                          </div>



                          <div className="flex-1 min-w-0">



                            <div className="flex items-center justify-between mb-1">



                              <p className="text-xs font-semibold text-[#0F172A] truncate">{notification.title}</p>



                              {!notification.read && (



                                <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0" />



                              )}



                            </div>



                            <p className="text-xs text-[#64748B] line-clamp-2">{notification.message}</p>



                            <p className="text-xs text-[#94A3B8] mt-1">



                              {new Date(notification.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}



                            </p>



                          </div>



                        </div>



                      </div>



                    ))



                  )}



                </div>







                {/* View All Button */}



                <button



                  onClick={handleViewAllNotifications}



                  className="w-full px-4 py-2 text-left text-sm font-medium text-[#2563EB] hover:bg-[#F8FAFC] transition-colors border-t border-[#E5E7EB]"



                >



                  View All



                </button>



              </div>



            )}



          </div>







          {/* Profile */}



          <div className="relative">

            <button

              onClick={() => {

                setProfileDropdownOpen(!profileDropdownOpen);

                setNotificationDropdownOpen(false);

              }}

              className="flex items-center gap-1 md:gap-2"

            >

              <div className="h-9 w-9 md:h-10 md:w-10 rounded-full overflow-hidden border border-[#E5E7EB] flex-shrink-0">

                {profileImageUrl ? (

                  <img

                    src={profileImageUrl}

                    alt={displayName}

                    className="h-full w-full object-cover"

                  />

                ) : (

                  <div className="h-full w-full bg-[#2563EB] flex items-center justify-center text-white font-semibold text-sm md:text-base">

                    {(displayName || 'U').charAt(0).toUpperCase()}

                  </div>

                )}

              </div>

              <ChevronDown className={`w-3.5 h-3.5 md:w-4 md:h-4 text-[#64748B] transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />

            </button>





            {/* Profile Dropdown */}

            {profileDropdownOpen && (

              <div className="absolute right-0 mt-2 w-44 md:w-48 rounded-xl bg-white border border-[#E5E7EB] shadow-lg py-1 z-50">

                <button

                  onClick={handleProfileClick}

                  className="w-full px-4 py-2.5 text-left text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"



                >



                  Profile



                </button>



                <button



                  onClick={handleSettingsClick}



                  className="w-full px-4 py-2.5 text-left text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"



                >



                  Settings



                </button>



                <div className="border-t border-[#E5E7EB] my-1" />



                <button



                  onClick={onLogout}



                  className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"



                >



                  Logout



                </button>



              </div>



            )}



          </div>



        </div>



      </div>



    </header>



  );



}







export function StudentLayout({ children, schoolInfo, userInfo, onLogout }) {



  return (



    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F7FAFC] flex">







      {/* LEFT SIDEBAR */}



      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-[80px] bg-white border-r border-[#E5E7EB] z-40">



        {/* Logo */}



        <div className="h-[76px] flex items-center justify-center border-b border-[#E5E7EB]">



          <img



            src="/L.png"



            alt="Libralink"



            className="h-10 w-10 object-contain"



          />



        </div>







        {/* Navigation Icons */}



        <nav className="flex-1 flex flex-col items-center py-8 gap-8">



          <NavLink



            to="/studentpage"



            end



            className={({ isActive }) => `



              relative p-3 rounded-xl transition-all duration-200



              ${isActive ? 'text-[#2563EB]' : 'text-[#64748B] hover:text-[#0F172A]'}



            `}



          >



            {({ isActive }) => (



              <>



                <Home className="w-6 h-6" />



                {isActive && (



                  <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-6 bg-[#2563EB] rounded-full" />



                )}



              </>



            )}



          </NavLink>







          <NavLink



            to="/studentpage/search"



            className={({ isActive }) => `



              relative p-3 rounded-xl transition-all duration-200



              ${isActive ? 'text-[#2563EB]' : 'text-[#64748B] hover:text-[#0F172A]'}



            `}



          >



            {({ isActive }) => (



              <>



                <Search className="w-6 h-6" />



                {isActive && (



                  <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-6 bg-[#2563EB] rounded-full" />



                )}



              </>



            )}



          </NavLink>







          <NavLink



            to="/studentpage/favorites"



            className={({ isActive }) => `



              relative p-3 rounded-xl transition-all duration-200



              ${isActive ? 'text-[#2563EB]' : 'text-[#64748B] hover:text-[#0F172A]'}



            `}



          >



            {({ isActive }) => (



              <>



                <Heart className="w-6 h-6" />



                {isActive && (



                  <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-6 bg-[#2563EB] rounded-full" />



                )}



              </>



            )}



          </NavLink>







          <NavLink



            to="/studentpage/inbox"



            className={({ isActive }) => `



              relative p-3 rounded-xl transition-all duration-200



              ${isActive ? 'text-[#2563EB]' : 'text-[#64748B] hover:text-[#0F172A]'}



            `}



          >



            {({ isActive }) => (



              <>



                <Mail className="w-6 h-6" />



                {isActive && (



                  <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-6 bg-[#2563EB] rounded-full" />



                )}



              </>



            )}



          </NavLink>







          <NavLink



            to="/studentpage/history"



            className={({ isActive }) => `



              relative p-3 rounded-xl transition-all duration-200



              ${isActive ? 'text-[#2563EB]' : 'text-[#64748B] hover:text-[#0F172A]'}



            `}



          >



            {({ isActive }) => (



              <>



                <ClockIcon className="w-6 h-6" />



                {isActive && (



                  <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-6 bg-[#2563EB] rounded-full" />



                )}



              </>



            )}



          </NavLink>



        </nav>







        {/* Bottom Icons */}



        <div className="flex flex-col items-center pb-6 gap-6">



          <NavLink



            to="/studentpage/settings"



            className={({ isActive }) => `



              relative p-3 rounded-xl transition-all duration-200



              ${isActive ? 'text-[#2563EB]' : 'text-[#64748B] hover:text-[#0F172A]'}



            `}



          >



            {({ isActive }) => (



              <>



                <Settings className="w-6 h-6" />



                {isActive && (



                  <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-6 bg-[#2563EB] rounded-full" />



                )}



              </>



            )}



          </NavLink>







          <button



            onClick={onLogout}



            className="relative p-3 rounded-xl transition-all duration-200 text-[#64748B] hover:text-red-600"



          >



            <LogOut className="w-6 h-6" />



          </button>



        </div>



      </aside>







      {/* MAIN CONTENT AREA */}



      <div className="flex-1 lg:ml-[80px]">



        {/* HEADER */}



        <StudentHeader userInfo={userInfo} onLogout={onLogout} />







        {/* MAIN CONTENT */}



        <main className="w-full pt-[64px] md:pt-[76px]">



          <div className="max-w-[1400px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-4 md:pt-6 w-full pb-20 md:pb-6">



            {children}



          </div>



        </main>



      </div>







      {/* MOBILE BOTTOM NAVIGATION */}

      <StudentBottomNav />



    </div>



  );



}







export function WelcomeSection({ displayName, schoolInfo, profileImage }) {



  const safeSchoolInfo = schoolInfo?.data || schoolInfo || {};



  const schoolName = safeSchoolInfo?.school_name || 'School';



  const schoolCode = safeSchoolInfo?.school_code || '';



  const schoolLogo = safeSchoolInfo?.logo;



  const schoolId = safeSchoolInfo?.school_id || safeSchoolInfo?.id;







  // Construct logo URL using the same logic as SuperAdminSchools



  const getLogoUrl = (logo) => {



    if (!logo) return '';



    const apiOrigin = 'http://localhost:5000';



    // If logo is already an absolute URL or a data/blob URL, return as-is



    if (



      logo.startsWith('http://') ||



      logo.startsWith('https://') ||



      logo.startsWith('data:') ||



      logo.startsWith('blob:')



    ) {



      return logo;



    }



    // If logo is a relative path like '/uploads/logos/..', prefix backend origin



    if (logo.startsWith('/')) return `${apiOrigin}${logo}`;



    return `${apiOrigin}/${logo}`;



  };







  const logoSrc = getLogoUrl(schoolLogo) || '/L.png';







  const getProfileImageUrl = (picture) => {



    if (!picture) return '';



    const apiOrigin = 'http://localhost:5000';



    if (



      picture.startsWith('http://') ||



      picture.startsWith('https://') ||



      picture.startsWith('data:') ||



      picture.startsWith('blob:')



    ) {



      return picture;



    }



    if (picture.startsWith('/')) return `${apiOrigin}${picture}`;



    return `${apiOrigin}/${picture}`;



  };







  const profileImageUrl = getProfileImageUrl(profileImage);







  return (



    <div className="bg-[#F8FAFC] rounded-2xl p-8 md:p-10">



      <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] items-center gap-8 lg:gap-12 min-h-[280px]">



        {/* Left Side: School Logo & Greeting */}



        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">



          {/* School Logo */}



          <div className="flex-shrink-0">



            <img



              src={logoSrc}



              alt={`${schoolName} logo`}



              className="h-20 w-20 object-contain"



              onError={(e) => {



                e.target.src = '/L.png';



              }}



            />



          </div>







          {/* Greeting Content */}



          <div className="flex-1 min-w-0">



            {/* School Name */}



            <div className="flex items-center gap-2 mb-3">



              <h3 className="text-base font-semibold text-[#2563EB] font-['Poppins']">{schoolName}</h3>



              {schoolCode && (



                <span className="text-sm text-[#64748B]">({schoolCode})</span>



              )}



            </div>







            {/* Dashboard Label */}



            <p className="text-xs uppercase tracking-[0.2em] text-[#64748B] font-medium mb-3 font-['Poppins']">Dashboard</p>



            



            {/* Welcome Message */}



            <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-2 font-['Poppins'] leading-tight">



              Welcome back, {displayName}!



            </h2>



            



            {/* Description */}



            <p className="text-base text-[#64748B] font-['Poppins']">



              Here's what's happening in your library today.



            </p>



            



            {/* Libralink Info */}



            <div className="mt-4 pt-4 border-t border-[#E5E7EB]">



              <p className="text-sm text-[#64748B] leading-relaxed">



                <span className="font-semibold text-[#2563EB]">Libralink</span> — Your digital library management system that connects students, schools, and resources. Search books, submit borrowing requests, track history, and receive real-time notifications — all in one seamless platform.



              </p>



            </div>



          </div>



        </div>







        {/* Right侧: Large Library Illustration */}



        <div className="flex justify-center lg:justify-end">



          <img



            src="/student.png"



            alt="Library Illustration"



            className="w-full max-w-[400px] h-auto object-contain"



            onError={(e) => {



              e.target.style.display = 'none';



            }}



          />



        </div>



      </div>



    </div>



  );



}







const accentStyles = {



  blue: {



    bg: 'bg-[#F8FAFC]',



    icon: 'bg-[#2563EB] text-white',



    text: 'text-[#0F172A]',



    subtitle: 'text-[#64748B]',



    border: 'border-[#E5E7EB]'



  },



  green: {



    bg: 'bg-[#F0FDF4]',



    icon: 'bg-[#16A34A] text-white',



    text: 'text-[#0F172A]',



    subtitle: 'text-[#64748B]',



    border: 'border-[#BBF7D0]'



  },



  orange: {



    bg: 'bg-[#FFF7ED]',



    icon: 'bg-[#F97316] text-white',



    text: 'text-[#0F172A]',



    subtitle: 'text-[#64748B]',



    border: 'border-[#FED7AA]'



  },



  red: {



    bg: 'bg-[#FEF2F2]',



    icon: 'bg-[#DC2626] text-white',



    text: 'text-[#0F172A]',



    subtitle: 'text-[#64748B]',



    border: 'border-[#FECACA]'



  },



};







export function StatsCard({ icon: Icon, title, value, subtitle, color = 'blue', onClick }) {



  const style = accentStyles[color] || accentStyles.blue;



  



  return (



    <div 



      onClick={onClick}



      className={`${style.bg} ${style.border} border rounded-2xl p-5 transition-all duration-200 hover:shadow-md cursor-pointer`}



    >



      <div className="flex items-start justify-between mb-4">



        <div className={`p-3 ${style.icon} rounded-xl`}>



          <Icon className="w-6 h-6" />



        </div>



        <span className="text-xs font-medium uppercase tracking-[0.1em] text-[#64748B]">{title}</span>



      </div>



      <div>



        <p className={`text-4xl font-bold ${style.text}`}>{value}</p>



        <p className={`mt-1 text-sm ${style.subtitle}`}>{subtitle}</p>



      </div>



    </div>



  );



}







export function BorrowedBooks({ books, onRenew }) {



  return (



    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6">



      <div className="flex items-center justify-between mb-6">



        <div>



          <h3 className="text-xl font-bold text-[#0F172A]">Currently Borrowed</h3>



          <p className="text-sm text-[#64748B]">Books checked out by you</p>



        </div>



        <button className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors">



          View All



        </button>



      </div>







      <div className="space-y-4">



        {books.length > 0 ? (



          books.map((book) => (



            <BorrowedBookCard key={book.id} book={book} onRenew={onRenew} />



          ))



        ) : (



          <div className="text-center py-12 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB]">



            <Book className="w-16 h-16 text-[#94A3B8] mx-auto mb-4" />



            <p className="text-sm font-medium text-[#64748B]">No borrowed books</p>



            <p className="text-xs text-[#94A3B8] mt-1">Start exploring the library!</p>



          </div>



        )}



      </div>



    </div>



  );



}







export function BorrowedBookCard({ book, onRenew }) {



  const statusStyles = {



    overdue: 'bg-red-100 text-red-700 border-red-200',



    dueSoon: 'bg-orange-100 text-orange-700 border-orange-200',



    onTime: 'bg-green-100 text-green-700 border-green-200',



  };







  const statusLabels = {



    overdue: 'Overdue',



    dueSoon: 'Due Soon',



    onTime: 'On Time',



  };







  return (



    <div className="flex items-center gap-4 p-5 rounded-2xl border border-[#E5E7EB] bg-white hover:border-[#2563EB] transition-all duration-200 shadow-sm hover:shadow-md">



      {/* Book Cover Thumbnail */}



      <div className="w-20 h-24 flex-shrink-0 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl flex items-center justify-center">



        <Book className="w-10 h-10 text-[#64748B]" />



      </div>







      {/* Book Info */}



      <div className="flex-1 min-w-0">



        <p className="text-base font-semibold text-[#0F172A] line-clamp-1 mb-1">{book.title}</p>



        <p className="text-sm text-[#64748B] mb-2">{book.author}</p>



        <div className="flex items-center gap-2">



          <span className={`text-xs font-medium px-3 py-1 rounded-full border ${statusStyles[book.status]}`}>



            {statusLabels[book.status]}



          </span>



          <span className="text-xs text-[#64748B]">· {book.dueIn}</span>



        </div>



      </div>







      {/* Actions */}



      <div className="flex items-center gap-3">



        {book.status !== 'overdue' && onRenew && (



          <button



            onClick={() => onRenew(book.borrowId)}



            className="px-4 py-2 text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl transition-colors"



          >



            Renew



          </button>



        )}



        <ChevronRight className="w-6 h-6 text-[#64748B] flex-shrink-0" />



      </div>



    </div>



  );



}







export function CalendarWidget({ borrowedBooks = [] }) {



  const [currentDate, setCurrentDate] = useState(new Date());



  



  const getDaysInMonth = (date) => {



    const year = date.getFullYear();



    const month = date.getMonth();



    const firstDay = new Date(year, month, 1);



    const lastDay = new Date(year, month + 1, 0);



    const daysInMonth = lastDay.getDate();



    const startingDayOfWeek = firstDay.getDay();



    



    return { daysInMonth, startingDayOfWeek };



  };







  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);



  



  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];



  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 



                     'July', 'August', 'September', 'October', 'November', 'December'];



  



  const getBookDueDates = () => {



    const dueDates = {};



    borrowedBooks.forEach(book => {



      if (book.dueDate) {



        const dueDate = new Date(book.dueDate);



        const dateKey = dueDate.toISOString().split('T')[0];



        dueDates[dateKey] = {



          status: book.status,



          count: (dueDates[dateKey]?.count || 0) + 1



        };



      }



    });



    return dueDates;



  };







  const bookDueDates = getBookDueDates();



  const today = new Date();



  const todayKey = today.toISOString().split('T')[0];







  const handlePrevMonth = () => {



    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));



  };







  const handleNextMonth = () => {



    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));



  };







  const handleToday = () => {



    setCurrentDate(new Date());



  };







  const getDateStatus = (day) => {



    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);



    const dateKey = date.toISOString().split('T')[0];



    



    if (dateKey === todayKey) return 'today';



    if (bookDueDates[dateKey]) return bookDueDates[dateKey].status;



    return null;



  };







  return (



    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-lg p-6">



      <div className="flex items-center justify-between mb-6">



        <div>



          <p className="text-xs font-medium uppercase tracking-[0.1em] text-[#64748B]">Calendar</p>



          <h3 className="mt-1 text-xl font-bold text-[#0F172A]">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>



        </div>



        <div className="flex items-center gap-2">



          <button



            onClick={handlePrevMonth}



            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"



          >



            <ChevronRight className="w-5 h-5 rotate-180 text-[#64748B]" />



          </button>



          <button



            onClick={handleToday}



            className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#0077B6] to-[#005f8f] hover:from-[#006699] hover:to-[#004d73] rounded-xl transition-all duration-300 shadow-md"



          >



            Today



          </button>



          <button



            onClick={handleNextMonth}



            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"



          >



            <ChevronRight className="w-5 h-5 text-[#64748B]" />



          </button>



        </div>



      </div>







      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-[#64748B] mb-3">



        {days.map((day) => (



          <div key={day}>{day}</div>



        ))}



      </div>







      <div className="grid grid-cols-7 gap-2 text-sm text-[#0F172A]">



        {/* Empty cells for days before the first day of the month */}



        {Array.from({ length: startingDayOfWeek }).map((_, index) => (



          <div key={`empty-${index}`} className="h-10" />



        ))}



        



        {/* Days of the month */}



        {Array.from({ length: daysInMonth }).map((_, index) => {



          const day = index + 1;



          const status = getDateStatus(day);



          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);



          const dateKey = date.toISOString().split('T')[0];



          const bookInfo = bookDueDates[dateKey];







          return (



            <div



              key={day}



              className={`



                relative flex h-10 items-center justify-center rounded-xl transition-all duration-300 cursor-pointer



                ${status === 'today' ? 'bg-gradient-to-r from-[#0077B6] to-[#005f8f] text-white font-bold shadow-lg scale-105' : ''}



                ${status === 'overdue' ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold' : ''}



                ${status === 'dueSoon' ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold' : ''}



                ${status === 'onTime' ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold' : ''}



                ${!status && 'hover:bg-gray-100 hover:scale-105'}



              `}



            >



              {day}



              {bookInfo && bookInfo.count > 1 && (



                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-[#0077B6] to-[#005f8f] text-white text-[10px] rounded-full flex items-center justify-center shadow-md">



                  {bookInfo.count}



                </span>



              )}



            </div>



          );



        })}



      </div>







      {/* Legend */}



      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-200">



        <div className="flex items-center gap-2">



          <div className="w-4 h-4 rounded-lg bg-gradient-to-r from-red-500 to-rose-600"></div>



          <span className="text-xs font-medium text-gray-600">Overdue</span>



        </div>



        <div className="flex items-center gap-2">



          <div className="w-4 h-4 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600"></div>



          <span className="text-xs font-medium text-gray-600">Due Soon</span>



        </div>



        <div className="flex items-center gap-2">



          <div className="w-4 h-4 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600"></div>



          <span className="text-xs font-medium text-gray-600">Due Date</span>



        </div>



      </div>



    </div>



  );



}







export function AnnouncementsWidget({ announcements }) {



  return (



    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-lg p-6">



      <div className="flex items-center justify-between mb-6">



        <div>



          <p className="text-xs font-medium uppercase tracking-[0.1em] text-[#64748B]">Announcements</p>



          <h3 className="mt-1 text-xl font-bold text-[#0F172A]">Library updates</h3>



        </div>



        <button className="text-sm font-medium text-[#0077B6] hover:text-[#005f8f] transition-colors">



          View All



        </button>



      </div>







      <div className="space-y-4">



        {announcements.length > 0 ? (



          announcements.map((announcement) => (



            <div key={announcement.id} className="p-5 rounded-2xl border border-[#E2E8F0] bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-white hover:border-[#0077B6] transition-all duration-300 shadow-sm hover:shadow-md">



              <h4 className="text-sm font-bold text-[#0F172A] mb-2">{announcement.title}</h4>



              <p className="text-sm text-[#64748B] leading-relaxed mb-3">{announcement.message}</p>



              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#0077B6]">{announcement.date}</p>



            </div>



          ))



        ) : (



          <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">



            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />



            <p className="text-sm font-medium text-gray-500">No announcements</p>



            <p className="text-xs text-gray-400 mt-1">Check back later for updates!</p>



          </div>



        )}



      </div>



    </div>



  );



}
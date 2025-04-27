/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Soft whites and off-whites
        'soft-white': '#FCFCFC',
        'cream': '#F8F7F4',
        'ivory': '#F6F6F1',
        
        // Light greys
        'platinum': '#E6E6E6',
        'gainsboro': '#DCDCDC',
        'light-grey': '#D3D3D3',
        
        // Wood tones
        'beige': '#F5F5DC',
        'light-wood': '#E6CCB2',
        'medium-wood': '#DDB892',
        'dark-wood': '#B08968',
        
        // Accent colors (subtle)
        'sage': '#D1D9CE',
        'dusty-blue': '#AEC5EB',
        'soft-charcoal': '#3C4043',
      },
      boxShadow: {
        'soft': '0 2px 15px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 20px rgba(0, 0, 0, 0.06)',
        'elevated': '0 8px 30px rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        'pill': '9999px',
      },
    },
  },
  plugins: [],
}

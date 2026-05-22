export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: '18px', md: '20px', lg: '32px' }
  const fontSize = sizes[size]
  return (
    <span style={{ fontSize, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1 }}>
      <span style={{ color: '#202124' }}>Gu</span>
      <span style={{ color: '#1a73e8' }}>ia</span>
      <span style={{ color: '#202124' }}>mos</span>
    </span>
  )
}

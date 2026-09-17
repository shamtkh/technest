import './burgerMenu.css'

export default function BurgerMenu({ checked, onChange }) {
  return (
    <label className="burger-menu" aria-label={checked ? 'Close menu' : 'Open menu'}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="top" />
      <span className="middle" />
      <span className="bottom" />
    </label>
  )
}

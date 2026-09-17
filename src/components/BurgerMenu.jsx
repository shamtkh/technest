import './burgerMenu.css'

export default function BurgerMenu({ checked, onChange }) {
  return (
    <label className="burger-menu container" aria-label={checked ? 'Close menu' : 'Open menu'}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="checkmark">
        <span />
        <span />
        <span />
      </span>
    </label>
  )
}

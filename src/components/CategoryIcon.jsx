import {
  Car, CircleDollarSign, Clapperboard, GraduationCap, HeartPulse,
  House, Shapes, ShoppingBag, ShoppingBasket, Utensils,
} from '../icons'

const categoryStyles = {
  Food: [Utensils, 'coral'],
  Groceries: [ShoppingBasket, 'green'],
  Housing: [House, 'blue'],
  Transportation: [Car, 'violet'],
  Shopping: [ShoppingBag, 'pink'],
  Entertainment: [Clapperboard, 'amber'],
  Health: [HeartPulse, 'red'],
  Education: [GraduationCap, 'indigo'],
  Income: [CircleDollarSign, 'lime'],
  Other: [Shapes, 'gray'],
}

export default function CategoryIcon({ category = 'Other', size = 17 }) {
  const [Icon, tone] = categoryStyles[category] || categoryStyles.Other
  return (
    <span className={`category-icon category-icon-${tone}`} aria-hidden="true">
      <Icon size={size} strokeWidth={1.9} />
    </span>
  )
}

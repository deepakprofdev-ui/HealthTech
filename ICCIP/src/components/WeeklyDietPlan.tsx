import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, Sun, Coffee, Moon, Sunset, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

/* ─── Three rotating weekly plans ─────────────────────────────── */
interface Meal { name: string; items: string[] }
interface DayPlan { day: string; short: string; accent: string; gradient: string; breakfast: Meal; mid: Meal; lunch: Meal; evening: Meal; dinner: Meal }
type WeeklyPlan = { title: string; theme: string; days: DayPlan[] }

const WEEK_PLANS: WeeklyPlan[] = [
    {
        title: 'Week 1 – Balanced Satvik', theme: 'text-amber-400',
        days: [
            {
                day: 'Monday', short: 'Mon', accent: 'amber', gradient: 'from-amber-900/40 to-slate-900/40',
                breakfast: { name: 'Poha', items: ['Poha with peanuts & curry leaves', 'Masala chai', '1 banana'] },
                mid: { name: 'Snack', items: ['Roasted chana', 'Coconut water'] },
                lunch: { name: 'Dal Rice', items: ['Dal tadka', 'Jeera rice', 'Aloo gobi', 'Cucumber salad', 'Chaas'] },
                evening: { name: 'Evening', items: ['Sprouts chaat with lemon', 'Green tea'] },
                dinner: { name: 'Dinner', items: ['2 Multigrain roti', 'Palak paneer', 'Onion raita'] }
            },
            {
                day: 'Tuesday', short: 'Tue', accent: 'teal', gradient: 'from-teal-900/40 to-slate-900/40',
                breakfast: { name: 'Idli Sambar', items: ['Idli ×3 + Sambar', 'Coconut chutney', 'Filter coffee'] },
                mid: { name: 'Snack', items: ['Guava or apple', 'Handful of almonds'] },
                lunch: { name: 'Rajma Rice', items: ['Rajma curry', 'Brown rice', 'Methi sabzi', 'Papad', 'Lassi'] },
                evening: { name: 'Evening', items: ['Makhana 30g', 'Herbal ginger tea'] },
                dinner: { name: 'Dinner', items: ['Tandoori roti ×2', 'Mixed veg curry', 'Moong dal soup'] }
            },
            {
                day: 'Wednesday', short: 'Wed', accent: 'emerald', gradient: 'from-emerald-900/40 to-slate-900/40',
                breakfast: { name: 'Upma', items: ['Vegetable upma', 'Tomato chutney', 'Green tea'] },
                mid: { name: 'Snack', items: ['Mixed fruit chaat', 'Chaas'] },
                lunch: { name: 'Chole Rice', items: ['Chole masala', 'Jeera rice', 'Kachumber salad', 'Chaas'] },
                evening: { name: 'Evening', items: ['Moong dal chilla ×1', 'Mint chutney'] },
                dinner: { name: 'Dinner', items: ['Khichdi', 'Kadhi pakora', 'Roasted papad'] }
            },
            {
                day: 'Thursday', short: 'Thu', accent: 'violet', gradient: 'from-violet-900/40 to-slate-900/40',
                breakfast: { name: 'Besan Chilla', items: ['Besan chilla ×2', 'Pudina chutney', 'Masala milk'] },
                mid: { name: 'Snack', items: ['2 dates + walnuts', 'Aam panna'] },
                lunch: { name: 'Dal Roti', items: ['Methi dal', 'Roti ×2', 'Aloo tamatar sabzi', 'Onion salad'] },
                evening: { name: 'Evening', items: ['Roasted peanuts + jaggery', 'Lemon water'] },
                dinner: { name: 'Dinner', items: ['Dosa ×2 + Sambar', 'Tomato onion chutney', 'Bowl of dahi'] }
            },
            {
                day: 'Friday', short: 'Fri', accent: 'rose', gradient: 'from-rose-900/40 to-slate-900/40',
                breakfast: { name: 'Uttapam', items: ['Rava uttapam ×2', 'Coconut chutney + Sambar', 'Filter coffee'] },
                mid: { name: 'Snack', items: ['Banana + 5 almonds', 'Coconut water'] },
                lunch: { name: 'Fish Curry', items: ['Fish curry', 'Steamed rice', 'Drumstick sabzi', 'Papad'] },
                evening: { name: 'Evening', items: ['Murmura bhel', 'Masala chaas'] },
                dinner: { name: 'Dinner', items: ['Dal makhani', 'Roti ×2', 'Bhindi fry', 'Boondi raita'] }
            },
            {
                day: 'Saturday', short: 'Sat', accent: 'orange', gradient: 'from-orange-900/40 to-slate-900/40',
                breakfast: { name: 'Sabudana', items: ['Sabudana khichdi', 'Dahi + green chutney', 'Herbal tea'] },
                mid: { name: 'Snack', items: ['Watermelon slice', 'Roasted chana'] },
                lunch: { name: 'Veg Biryani', items: ['Veg biryani (light)', 'Burani raita', 'Onion salad', 'Papad'] },
                evening: { name: 'Evening', items: ['Sattu sharbat', 'Mathri ×2'] },
                dinner: { name: 'Dinner', items: ['Aloo paratha ×2 (light oil)', 'Mint chutney + Dahi'] }
            },
            {
                day: 'Sunday', short: 'Sun', accent: 'blue', gradient: 'from-blue-900/40 to-slate-900/40',
                breakfast: { name: 'Pesarattu', items: ['Pesarattu (green moong dosa)', 'Ginger chutney', 'Masala chai'] },
                mid: { name: 'Snack', items: ['Papaya cubes', '6 cashews'] },
                lunch: { name: 'Pav Bhaji', items: ['Pav bhaji (whole wheat pav)', 'Cucumber raita', 'Lime water'] },
                evening: { name: 'Evening', items: ['Popcorn (plain)', 'Jaljeera drink'] },
                dinner: { name: 'Dinner', items: ['Tomato soup', 'Multigrain roti ×2', 'Mixed dal + Spinach sabzi'] }
            },
        ],
    },
    {
        title: 'Week 2 – Protein Rich', theme: 'text-emerald-400',
        days: [
            {
                day: 'Monday', short: 'Mon', accent: 'amber', gradient: 'from-amber-900/40 to-slate-900/40',
                breakfast: { name: 'Egg Bhurji', items: ['Egg bhurji (or paneer bhurji)', 'Whole wheat toast ×2', 'Masala chai'] },
                mid: { name: 'Snack', items: ['Boiled chana chaat', 'Lemon water'] },
                lunch: { name: 'Chicken Curry', items: ['Chicken curry (or soya chunks)', 'Steamed rice', 'Salad', 'Curd'] },
                evening: { name: 'Evening', items: ['Greek yoghurt with honey', 'Mixed seeds handful'] },
                dinner: { name: 'Dinner', items: ['Moong dal cheela ×3', 'Mint chutney', 'Tomato soup'] }
            },
            {
                day: 'Tuesday', short: 'Tue', accent: 'teal', gradient: 'from-teal-900/40 to-slate-900/40',
                breakfast: { name: 'Dalia', items: ['Dalia (broken wheat) porridge', 'Mixed nuts', 'Green tea'] },
                mid: { name: 'Snack', items: ['Hard-boiled eggs ×2 (or paneer 50g)', 'Apple'] },
                lunch: { name: 'Paneer Rice', items: ['Palak paneer', 'Roti ×2', 'Kachumber salad', 'Buttermilk'] },
                evening: { name: 'Evening', items: ['Roasted soya sticks', 'Coconut water'] },
                dinner: { name: 'Dinner', items: ['Lentil soup', 'Multigrain roti ×2', 'Stir-fried veggies'] }
            },
            {
                day: 'Wednesday', short: 'Wed', accent: 'emerald', gradient: 'from-emerald-900/40 to-slate-900/40',
                breakfast: { name: 'Moong Dosa', items: ['Moong dal dosa ×2', 'Sambar', 'Coconut chutney'] },
                mid: { name: 'Snack', items: ['Peanut butter on rice cake ×2', 'Banana'] },
                lunch: { name: 'Rajma Roti', items: ['Rajma masala', 'Multigrain roti ×2', 'Onion salad', 'Dahi'] },
                evening: { name: 'Evening', items: ['Sprouts bhel', 'Ginger lemon tea'] },
                dinner: { name: 'Dinner', items: ['Grilled fish / tofu', 'Sautéed vegetables', 'Brown rice'] }
            },
            {
                day: 'Thursday', short: 'Thu', accent: 'violet', gradient: 'from-violet-900/40 to-slate-900/40',
                breakfast: { name: 'Oats Chilla', items: ['Oats + besan chilla ×2', 'Green chutney', 'Masala chai'] },
                mid: { name: 'Snack', items: ['Handful of mixed nuts', 'Orange'] },
                lunch: { name: 'Chicken Rice', items: ['Chicken biryani (light)', 'Raita', 'Salad'] },
                evening: { name: 'Evening', items: ['Boiled groundnuts', 'Chaas'] },
                dinner: { name: 'Dinner', items: ['Dal fry', 'Roti ×2', 'Bhindi fry', 'Curd'] }
            },
            {
                day: 'Friday', short: 'Fri', accent: 'rose', gradient: 'from-rose-900/40 to-slate-900/40',
                breakfast: { name: 'Paneer Wrap', items: ['Paneer paratha ×1', 'Low-fat dahi', 'Filter coffee'] },
                mid: { name: 'Snack', items: ['Makhana + seeds mix', 'Coconut water'] },
                lunch: { name: 'Fish Rice', items: ['Fish curry', 'Steamed rice', 'Drumstick sabzi', 'Papad'] },
                evening: { name: 'Evening', items: ['Chana chaat', 'Green tea'] },
                dinner: { name: 'Dinner', items: ['Egg curry / paneer curry', 'Roti ×2', 'Spinach sabzi'] }
            },
            {
                day: 'Saturday', short: 'Sat', accent: 'orange', gradient: 'from-orange-900/40 to-slate-900/40',
                breakfast: { name: 'Pesarattu', items: ['Pesarattu ×2', 'Ginger chutney', 'Herbal tea'] },
                mid: { name: 'Snack', items: ['Fruit bowl (papaya, guava, apple)', 'Almonds ×6'] },
                lunch: { name: 'Satvik Thali', items: ['Dal makhani', 'Jeera pulao', 'Mixed veg', 'Roti ×1', 'Raita'] },
                evening: { name: 'Evening', items: ['Roasted peanuts', 'Lemon soda'] },
                dinner: { name: 'Dinner', items: ['Lentil soup', 'Multigrain roti ×2', 'Stir-fried spinach'] }
            },
            {
                day: 'Sunday', short: 'Sun', accent: 'blue', gradient: 'from-blue-900/40 to-slate-900/40',
                breakfast: { name: 'Masala Oats', items: ['Masala oats', 'Boiled egg ×1', 'Masala chai'] },
                mid: { name: 'Snack', items: ['Sattu drink', 'Date + walnut balls ×2'] },
                lunch: { name: 'Special Thali', items: ['Chole bhature (light)', 'Pickled onion', 'Mango lassi'] },
                evening: { name: 'Evening', items: ['Watermelon slices', 'Jaljeera'] },
                dinner: { name: 'Dinner', items: ['Tomato soup', 'Grilled chicken / cottage cheese', 'Salad'] }
            },
        ],
    },
    {
        title: 'Week 3 – Low-Carb Desi', theme: 'text-violet-400',
        days: [
            {
                day: 'Monday', short: 'Mon', accent: 'amber', gradient: 'from-amber-900/40 to-slate-900/40',
                breakfast: { name: 'Veg Omelette', items: ['3-egg vegetable omelette', 'Green chutney', 'Black coffee / green tea'] },
                mid: { name: 'Snack', items: ['Celery + peanut butter', 'Lemon water'] },
                lunch: { name: 'Cauliflower', items: ['Gobi matar sabzi', '2 Roti (no rice)', 'Dal soup', 'Salad'] },
                evening: { name: 'Evening', items: ['Roasted makhana ×30g', 'Herbal tea'] },
                dinner: { name: 'Dinner', items: ['Palak paneer', '1 roti', 'Clear soup'] }
            },
            {
                day: 'Tuesday', short: 'Tue', accent: 'teal', gradient: 'from-teal-900/40 to-slate-900/40',
                breakfast: { name: 'Sautéed Veg', items: ['Sautéed mushrooms + capsicum', 'Multigrain toast ×1', 'Chai'] },
                mid: { name: 'Snack', items: ['Boiled eggs ×2 (or paneer)', 'Cucumber sticks'] },
                lunch: { name: 'Keto Dal', items: ['Moong dal tadka', '1 roti (low carb)', 'Stir-fried broccoli'] },
                evening: { name: 'Evening', items: ['Sprouts salad', 'Green tea'] },
                dinner: { name: 'Dinner', items: ['Grilled fish', 'Sautéed veggies', 'Buttermilk'] }
            },
            {
                day: 'Wednesday', short: 'Wed', accent: 'emerald', gradient: 'from-emerald-900/40 to-slate-900/40',
                breakfast: { name: 'Moong Chilla', items: ['Moong dal chilla ×2', 'Mint chutney', 'Black coffee'] },
                mid: { name: 'Snack', items: ['Handful of walnuts + almonds', 'Apple'] },
                lunch: { name: 'Chicken Bowl', items: ['Grilled chicken (or tofu)', 'Rajma salad', 'Curd (small)'] },
                evening: { name: 'Evening', items: ['Roasted chana', 'Ginger lemon water'] },
                dinner: { name: 'Dinner', items: ['Egg curry (no rice)', 'Stir-fried methi', 'Clear dal soup'] }
            },
            {
                day: 'Thursday', short: 'Thu', accent: 'violet', gradient: 'from-violet-900/40 to-slate-900/40',
                breakfast: { name: 'Paneer Bhurji', items: ['Paneer bhurji', '1 multigrain toast', 'Green tea'] },
                mid: { name: 'Snack', items: ['Makhana + seeds', 'Coconut water'] },
                lunch: { name: 'Veg Soup', items: ['Mixed vegetable soup', '2 roti', 'Soya chunks sabzi'] },
                evening: { name: 'Evening', items: ['Boiled groundnuts', 'Chaas'] },
                dinner: { name: 'Dinner', items: ['Lentil soup', 'Sautéed brinjal', 'Dahi'] }
            },
            {
                day: 'Friday', short: 'Fri', accent: 'rose', gradient: 'from-rose-900/40 to-slate-900/40',
                breakfast: { name: 'Egg Dosa', items: ['Egg dosa (1)', 'Sambar', 'Chai'] },
                mid: { name: 'Snack', items: ['Celery + hummus', 'Lemon water'] },
                lunch: { name: 'Palak Chicken', items: ['Palak chicken / paneer', 'Roti ×2', 'Onion salad'] },
                evening: { name: 'Evening', items: ['Mixed seed trail mix', 'Green tea'] },
                dinner: { name: 'Dinner', items: ['Clear vegetable soup', 'Grilled fish / cottage cheese', 'Salad'] }
            },
            {
                day: 'Saturday', short: 'Sat', accent: 'orange', gradient: 'from-orange-900/40 to-slate-900/40',
                breakfast: { name: 'Dahi Bowl', items: ['Dahi + chia seeds + berries', 'Multigrain toast ×1', 'Chai'] },
                mid: { name: 'Snack', items: ['Hardboiled eggs ×2', 'Cucumber'] },
                lunch: { name: 'Ragi Roti', items: ['Ragi roti ×2', 'Palak dal', 'Onion tomato salad'] },
                evening: { name: 'Evening', items: ['Roasted peanuts', 'Herbal tea'] },
                dinner: { name: 'Dinner', items: ['Chicken / paneer tikka', 'Mint chutney', 'Mixed greens salad'] }
            },
            {
                day: 'Sunday', short: 'Sun', accent: 'blue', gradient: 'from-blue-900/40 to-slate-900/40',
                breakfast: { name: 'French Toast', items: ['Multigrain french toast ×2', 'Mixed fruits', 'Black coffee'] },
                mid: { name: 'Snack', items: ['Sattu sharbat', 'Handful of almonds'] },
                lunch: { name: 'Special Fish', items: ['Tandoori fish / paneer tikka', 'Roti ×2', 'Dahi', 'Salad'] },
                evening: { name: 'Evening', items: ['Sprouts chaat', 'Coconut water'] },
                dinner: { name: 'Dinner', items: ['Palak soup', '2 roti', 'Moong dal', 'Dahi'] }
            },
        ],
    },
];

/* ─── Accent helpers ──────────────────────────────────────────────── */
const ACCENT_DOT: Record<string, string> = {
    amber: 'bg-amber-400', teal: 'bg-teal-400', emerald: 'bg-emerald-400',
    violet: 'bg-violet-400', rose: 'bg-rose-400', orange: 'bg-orange-400', blue: 'bg-blue-400',
};
const ACCENT_RING: Record<string, string> = {
    amber: 'border-amber-500/40 bg-amber-500/10', teal: 'border-teal-500/40 bg-teal-500/10',
    emerald: 'border-emerald-500/40 bg-emerald-500/10', violet: 'border-violet-500/40 bg-violet-500/10',
    rose: 'border-rose-500/40 bg-rose-500/10', orange: 'border-orange-500/40 bg-orange-500/10',
    blue: 'border-blue-500/40 bg-blue-500/10',
};
const MEAL_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    breakfast: { icon: <Sun className="w-3.5 h-3.5" />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    mid: { icon: <Coffee className="w-3.5 h-3.5" />, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' },
    lunch: { icon: <Utensils className="w-3.5 h-3.5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    evening: { icon: <Sunset className="w-3.5 h-3.5" />, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    dinner: { icon: <Moon className="w-3.5 h-3.5" />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
};

/* ─── Helpers ─────────────────────────────────────────────────────── */
function getCurrentWeekPlan(): { weekIdx: number; dayIdx: number } {
    const now = new Date();
    // Week number since a fixed epoch (2026-01-05 = Monday, week 0)
    const epoch = new Date(2026, 0, 5);
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksSinceEpoch = Math.floor((now.getTime() - epoch.getTime()) / msPerWeek);
    const weekIdx = ((weeksSinceEpoch % WEEK_PLANS.length) + WEEK_PLANS.length) % WEEK_PLANS.length;
    // 0=Sun,1=Mon...6=Sat → map to 0=Mon..6=Sun
    const js = now.getDay(); // 0=Sun
    const dayIdx = js === 0 ? 6 : js - 1;
    return { weekIdx, dayIdx };
}

/* ─── Component ───────────────────────────────────────────────────── */
export default function WeeklyDietPlan() {
    const { weekIdx: initWeek, dayIdx: initDay } = getCurrentWeekPlan();
    const [weekIdx, setWeekIdx] = useState(initWeek);
    const [dayIdx, setDayIdx] = useState(initDay);
    const [paused, setPaused] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const week = WEEK_PLANS[weekIdx];
    const day = week.days[dayIdx];

    const nextDay = () => {
        setDayIdx(prev => {
            const next = (prev + 1) % 7;
            if (next === 0) setWeekIdx(w => (w + 1) % WEEK_PLANS.length);
            return next;
        });
    };
    const prevDay = () => {
        setDayIdx(prev => {
            const next = (prev + 6) % 7;
            if (prev === 0) setWeekIdx(w => (w + WEEK_PLANS.length - 1) % WEEK_PLANS.length);
            return next;
        });
    };

    // Auto-advance: 5 seconds per day
    useEffect(() => {
        if (paused) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
        intervalRef.current = setInterval(nextDay, 5000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [paused]);

    const meals = [
        { key: 'breakfast', meal: day.breakfast },
        { key: 'mid', meal: day.mid },
        { key: 'lunch', meal: day.lunch },
        { key: 'evening', meal: day.evening },
        { key: 'dinner', meal: day.dinner },
    ];

    return (
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-orange-400" />
                    <div>
                        <h3 className="font-bold text-lg">Indian Diet Plan</h3>
                        <p className={`text-[10px] font-semibold ${week.theme}`}>{week.title}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button onClick={prevDay} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-slate-400 hover:text-white">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setPaused(p => !p)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-slate-400 hover:text-white" title={paused ? 'Resume' : 'Pause'}>
                        {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </button>
                    <button onClick={nextDay} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-slate-400 hover:text-white">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Day tabs */}
            <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
                {week.days.map((d, i) => (
                    <button key={i}
                        onClick={() => { setDayIdx(i); setPaused(true); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border transition-all ${i === dayIdx ? `${ACCENT_RING[d.accent]} text-white` : 'text-slate-500 border-transparent hover:bg-white/5'
                            }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${i === dayIdx ? ACCENT_DOT[d.accent] : 'bg-slate-700'}`} />
                        {d.short}
                    </button>
                ))}
            </div>

            {/* Day card */}
            <AnimatePresence mode="wait">
                <motion.div key={`${weekIdx}-${dayIdx}`}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.22 }}
                    className={`rounded-2xl bg-gradient-to-br ${day.gradient} border border-white/5 p-4`}
                >
                    <div className="flex items-center gap-2 mb-3">
                        <span className={`w-2 h-2 rounded-full ${ACCENT_DOT[day.accent]} animate-pulse`} />
                        <span className="font-black text-sm">{day.day}</span>
                        <span className="text-[9px] uppercase tracking-widest text-slate-500 ml-auto">{week.title}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2.5">
                        {meals.map(({ key, meal }) => {
                            const meta = MEAL_META[key];
                            return (
                                <div key={key} className={`rounded-xl p-3 border ${meta.bg}`}>
                                    <div className={`flex items-center gap-1.5 mb-2 ${meta.color}`}>
                                        {meta.icon}
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{meal.name}</span>
                                    </div>
                                    <ul className="space-y-1">
                                        {meal.items.map((item, j) => (
                                            <li key={j} className="flex items-start gap-1.5 text-[11px] text-slate-300 leading-snug">
                                                <span className={`w-1 h-1 rounded-full ${meta.color.replace('text-', 'bg-')} mt-1.5 shrink-0`} />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Progress dots + week badges */}
            <div className="flex items-center justify-between mt-3">
                <div className="flex gap-1.5">
                    {week.days.map((d, i) => (
                        <button key={i} onClick={() => { setDayIdx(i); setPaused(true); }}
                            className={`rounded-full transition-all ${i === dayIdx ? `w-5 h-1.5 ${ACCENT_DOT[d.accent]}` : 'w-1.5 h-1.5 bg-slate-700 hover:bg-slate-500'}`}
                        />
                    ))}
                </div>
                <div className="flex gap-1">
                    {WEEK_PLANS.map((wp, i) => (
                        <button key={i} onClick={() => { setWeekIdx(i); setPaused(true); }}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md transition-all ${i === weekIdx ? `${wp.theme} bg-white/10` : 'text-slate-600 hover:text-slate-400'}`}>
                            W{i + 1}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Mô tả tiếng Anh cho từng món, dùng để sinh ảnh bằng AI.
//
// Đây là phần quan trọng nhất và cũng là phần AI hay làm sai nhất. Đưa mỗi
// "Phở bò" thì mô hình rất hay trả về ramen Nhật hoặc mì Trung Quốc; "Bánh mì"
// thành sandwich kẹp kiểu Mỹ. Mô tả phải nói rõ loại sợi, loại bánh, nước dùng
// và cách bày, không được để mô hình tự đoán.
//
// Mỗi mô tả tả MÓN, không tả bố cục hay ánh sáng — phần đó nằm trong
// STYLE_SUFFIX bên dưới và giống nhau cho cả 58 món, để bộ ảnh trông cùng một bộ.

export const DISH_PROMPTS = Object.freeze({
  // --- Phở & Bún ---
  'bun-bo': 'bun bo Hue, Vietnamese spicy beef noodle soup, thick round rice noodles, slices of beef shank and pork, deep red-orange lemongrass chilli broth, banana blossom and herbs on the side',
  'canh-bun': 'canh bun, northern Vietnamese crab noodle soup, thick rice noodles, orange crab paste broth, water spinach, fried tofu, chunks of crab cake',
  'pho-bo': 'pho bo, Vietnamese beef noodle soup, flat white rice noodles in clear brown beef broth, thin slices of rare beef, spring onion, coriander, side plate of bean sprouts and Thai basil',
  'pho-ga': 'pho ga, Vietnamese chicken noodle soup, flat white rice noodles in clear golden chicken broth, shredded poached chicken, spring onion, coriander',
  'mien-ga-trung-non': 'mien ga, Vietnamese glass noodle chicken soup, translucent cellophane noodles in clear golden broth, shredded chicken, small immature egg yolks, spring onion',
  'bun-mam-nem': 'bun mam nem, Vietnamese dry rice vermicelli bowl, sliced boiled pork belly, fresh herbs, shredded green mango and lettuce, small bowl of dark anchovy dipping sauce on the side',
  'bun-thit-nuong': 'bun thit nuong, Vietnamese cold rice vermicelli bowl, charcoal grilled pork slices, crispy spring roll, lettuce, cucumber, pickled carrot, crushed peanuts, small jug of fish sauce dressing',

  // --- Cơm ---
  'com-ga': 'com ga xoi mo, Vietnamese crispy fried chicken leg with golden lacquered skin, served over white rice with cucumber and pickled vegetables',
  'com-chien-duong-chau': 'Yangzhou fried rice, wok-fried rice with diced Chinese sausage, shrimp, green peas, carrot and scrambled egg',
  'com-tam-trung': 'com tam, Vietnamese broken rice plate, grilled marinated pork chop, sunny side up fried egg, pickled carrot and daikon, cucumber slices',
  'com-chien-ca-man': 'salted fish fried rice, wok-fried rice with flakes of salted fish, diced chicken, spring onion and egg',

  // --- Bánh mì ---
  'banh-mi-cha-ca': 'banh mi with Vietnamese fried fish cake, crusty thin airy baguette, pickled carrot and daikon, cucumber, coriander, chilli',
  'banh-mi-bo-la-lot': 'banh mi with bo la lot, grilled beef rolled in betel leaf, crusty thin airy Vietnamese baguette, pickled vegetables, herbs',
  'banh-mi-heo-quay': 'banh mi with crispy roast pork belly, crackling skin, crusty thin airy Vietnamese baguette, pickled carrot and daikon, coriander, chilli',
  'banh-mi-thit-nuong': 'banh mi with grilled marinated pork, crusty thin airy Vietnamese baguette, pickled carrot and daikon, cucumber, coriander',
  'banh-mi-ca-hop': 'banh mi with tinned sardines in tomato sauce, crusty thin airy Vietnamese baguette, sliced onion, coriander, chilli',
  'banh-mi-trung': 'banh mi with fried eggs, crusty thin airy Vietnamese baguette, runny yolk, spring onion, soy sauce, cucumber and coriander',

  // --- Mì xào ---
  'mi-xao-ga': 'Vietnamese stir-fried egg noodles with chicken, thin yellow noodles, sliced chicken, bok choy, carrot, onion, glossy brown sauce',
  'mi-xao-bo': 'Vietnamese stir-fried egg noodles with beef, thin yellow noodles, sliced beef, bok choy, onion, glossy brown sauce',

  // --- Món đặc biệt ---
  'bo-kho': 'bo kho, Vietnamese beef stew, tender beef chunks and carrot in rich red-brown lemongrass and annatto broth, Thai basil on top, crusty baguette on the side',
  'pha-lau-long-bo': 'pha lau, Vietnamese braised beef offal stew, tripe and intestine in fragrant coconut curry broth, star anise, coriander, crusty bread on the side',
  'cari-ga': 'ca ri ga, Vietnamese chicken curry, chicken pieces and chunks of sweet potato and carrot in creamy orange coconut curry, coriander and spring onion on top',
  'banh-bot-loc': 'banh bot loc, Vietnamese translucent tapioca dumplings with whole shrimp and pork belly visible through the wrapper, fried shallots on top, small dish of fish sauce',
  'bap-xao': 'bap xao, Vietnamese stir-fried sweetcorn with butter, dried shrimp, spring onion and crispy fried shallots, served in a small bowl',

  // --- Ăn vặt ---
  'banh-bo': 'banh bo, Vietnamese steamed rice cake, honeycomb texture inside, pale green pandan colour, cut into wedges',
  'banh-tieu': 'banh tieu, Vietnamese hollow sesame doughnut, golden deep-fried, coated in white sesame seeds, torn open to show hollow inside',
  'khoai-tay-chien': 'french fries tossed with cheese powder in a paper cup, golden crisp, small dish of dipping sauce',
  'banh-chuoi-nuong': 'banh chuoi nuong, Vietnamese baked banana cake, caramelised golden brown top, sliced to show layers of banana and bread inside',
  'banh-chuoi-hap': 'banh chuoi hap, Vietnamese steamed banana cake, translucent pink-purple slices, drizzled with coconut cream and toasted sesame',
  'khoai-mi-nuong': 'khoai mi nuong, Vietnamese baked cassava cake, golden brown crust, dense chewy interior, cut into squares',
  'banh-da-lon': 'banh da lon, Vietnamese steamed layer cake, alternating green pandan and yellow mung bean stripes, glossy chewy slices',
  'khoai-mo-chien': 'fried purple yam cakes, deep purple inside, crisp golden crust, served on a small plate',

  // --- Cà phê ---
  'ca-phe-den': 'Vietnamese black iced coffee, dark strong coffee over ice in a tall clear glass',
  'ca-phe-sua': 'Vietnamese iced coffee with condensed milk, layered brown and cream in a tall clear glass, ice cubes',
  'bac-xiu': 'bac xiu, Vietnamese white coffee, mostly condensed milk with a little coffee, pale creamy beige, tall clear glass with ice',
  latte: 'iced latte in a tall clear glass, espresso poured over milk showing layers, ice cubes',

  // --- Sinh tố & Nước ép ---
  'sinh-to-chuoi-viet-quat': 'banana and blueberry smoothie, thick pale purple, in a tall clear glass',
  'sinh-to-mang-cau': 'soursop smoothie, thick creamy white, in a tall clear glass',
  'sinh-to-bo': 'avocado smoothie, thick pale green, in a tall clear glass',
  'sinh-to-xoai': 'mango smoothie, thick bright yellow-orange, in a tall clear glass',
  'sinh-to-dau': 'strawberry smoothie, thick pink, in a tall clear glass',
  'dua-hau-ep': 'fresh watermelon juice, bright pink-red, in a tall clear glass with ice',
  'oi-ep': 'fresh guava juice, pale cloudy pink-white, in a tall clear glass with ice',
  'cam-ep': 'fresh orange juice, bright orange with pulp, in a tall clear glass with ice',
  'thom-ep': 'fresh pineapple juice, golden yellow, in a tall clear glass with ice',

  // --- Trà & Giải khát ---
  'rau-ma-dua': 'Vietnamese pennywort juice with coconut milk, opaque light green, in a tall clear glass with ice',
  'rau-ma-nguyen-chat': 'pure Vietnamese pennywort juice, vivid deep green, in a tall clear glass with ice',
  'rau-ma-dau': 'Vietnamese pennywort and mung bean drink, layered green over pale yellow, in a tall clear glass with ice',
  'suong-sam': 'suong sam, Vietnamese green jelly drink, soft green jelly cubes in clear syrup, tall glass with ice',
  'sam-dua': 'sam dua, Vietnamese pandan herbal drink, jade green, in a tall clear glass with ice',
  'tra-dao': 'iced peach tea, amber tea with slices of peach and ice in a tall clear glass',
  'tra-tac': 'iced kumquat tea, amber tea with halved kumquats and ice in a tall clear glass',
  'tra-nong': 'hot Vietnamese black tea in a small clear glass cup, steam rising, on a saucer',
  'da-me': 'da me, Vietnamese iced tamarind drink, cloudy brown, in a tall clear glass with ice',
  'la-han-qua': 'monk fruit herbal tea, dark amber, in a tall clear glass with ice',
  'da-chanh': 'Vietnamese iced lemon tea, pale amber with a lemon slice, in a tall clear glass with ice',
  'chanh-day': 'passion fruit juice with visible seeds, deep yellow-orange, in a tall clear glass with ice',
  'chanh-muoi': 'chanh muoi, Vietnamese salted preserved lime soda, cloudy pale yellow with a whole preserved lime at the bottom, tall clear glass with ice'
});

// Phần đuôi giống hệt nhau cho cả 58 món. Đây là thứ giữ cho bộ ảnh trông cùng
// một bộ thay vì 58 phong cách khác nhau: cùng bàn gỗ, cùng hướng sáng, cùng
// khoảng cách chụp.
export const STYLE_SUFFIX =
  'Authentic Vietnamese street food. Top-down photo on a warm rustic wooden table, ' +
  'soft natural window light from the left, gentle shadows. ' +
  'Square 1:1 composition, the dish centred and filling about 80% of the frame, ' +
  'even margin on all four sides. Photorealistic food photography, sharp focus, ' +
  'appetising and freshly made. No text, no watermark, no logo, no hands, no menu card.';

export function buildPrompt(id) {
  const dish = DISH_PROMPTS[id];
  if (!dish) return null;
  return `A photo of ${dish}. ${STYLE_SUFFIX}`;
}

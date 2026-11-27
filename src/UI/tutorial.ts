import type { Language } from '../Config/language.ts';

type Page = { title: string; steps: [label: string, instruction: string, icon?: string][] };
const guides: Record<Language, { keyboard: Page; touch: Page; shared: Page[] }> = {
  vi: {
    keyboard: { title: 'Điều khiển trên máy tính', steps: [
      ['WASD / Phím mũi tên', 'Di chuyển quanh nông trại.'],
      ['Chuột trái / Phím cách', 'Nhấp vào ô gần bạn hoặc dùng phím cách để thao tác trên ô trước mặt.'],
      ['E', 'Nói chuyện với Mira, mở cửa hàng hoặc vào nhà ngủ.'],
      ['1–9, 0, [, ]', 'Đổi công cụ bằng số tương ứng hoặc nhấp vào thanh công cụ.'],
    ] },
    touch: { title: 'Điều khiển trên điện thoại', steps: [
      ['Cụm phím bên trái', 'Chạm và giữ một hướng để đi. Kéo ngón tay sang hướng khác để đổi hướng.'],
      ['Dùng', 'Chạm để dùng vật phẩm ở ô viền vàng trước mặt. Bạn cũng có thể chạm vào ô đất gần mình.','hoe'],
      ['Tương tác', 'Đến gần nhà, cửa hàng hoặc Mira rồi chạm nút này.','bell'],
      ['Thanh công cụ', 'Chạm vào một ô bên dưới để đổi công cụ hoặc chọn hạt giống.','bag'],
    ] },
    shared: [
      { title: 'Trồng luống đầu tiên', steps: [
        ['1. Xới đất', 'Đến luống phía nam nhà, chọn cuốc đồng rồi xới một ô đất.','hoe'],
        ['2. Gieo hạt', 'Chọn hạt củ cải và dùng trên ô vừa xới.','turnipSeed'],
        ['3. Tưới nước', 'Chọn bình tưới và tưới ô vừa gieo.','can'],
      ] },
      { title: 'Ngủ và thu hoạch', steps: [
        ['Về nhà trước khi ngủ', 'Đứng gần cửa nhà và tương tác để ngủ. Bạn sẽ hồi thể lực và châm đầy bình tưới.','home'],
        ['Tưới qua hai đêm', 'Củ cải lớn sau hai đêm được tưới. Hãy tưới lại sau đêm đầu tiên.','water'],
        ['Thu hoạch', 'Dùng công cụ trên cây đã lớn hoặc chạm vào cây khi đứng cạnh.','turnip'],
      ] },
      { title: 'Bán nông sản và mua thêm hạt', steps: [
        ['Đến cửa hàng Mira', 'Theo đường đất về phía đông, đứng trước cửa hàng và tương tác.','shop'],
        ['Bán và mua', 'Chọn Bán để đổi nông sản lấy vàng. Chọn Mua để lấy thêm hạt giống.','gold'],
        ['Nhận thưởng', 'Mở Nhật ký sau khi hoàn thành mục tiêu để nhận thưởng.','book'],
      ] },
    ],
  },
  en: {
    keyboard: { title: 'Keyboard and mouse controls', steps: [
      ['WASD / Arrow keys', 'Move around the farm.'],
      ['Left click / Space', 'Click a nearby tile, or press Space to use the selected item on the tile in front.'],
      ['E', 'Talk to Mira, open the market, or go to bed at the cottage.'],
      ['1–9, 0, [, ]', 'Select a tool by its key or click a slot on the tool belt.'],
    ] },
    touch: { title: 'Touch controls', steps: [
      ['Left direction pad', 'Press and hold a direction to walk. Slide your finger to change direction.'],
      ['Use', 'Tap to use your item on the outlined tile ahead. You can also tap a nearby tile.','hoe'],
      ['Interact', 'Walk up to the cottage, market, or Mira, then tap this button.','bell'],
      ['Tool belt', 'Tap a slot along the bottom to switch tools or select seeds.','bag'],
    ] },
    shared: [
      { title: 'Plant your first crop', steps: [
        ['1. Till the soil', 'Walk to the field south of the cottage and till a tile with the copper hoe.','hoe'],
        ['2. Sow a seed', 'Select turnip seeds and plant one in the tilled tile.','turnipSeed'],
        ['3. Water it', 'Select the watering can and water the planted tile.','can'],
      ] },
      { title: 'Sleep and harvest', steps: [
        ['Go home to sleep', 'Stand by the cottage door and interact to sleep. This restores energy and refills your can.','home'],
        ['Water for two nights', 'Turnips grow after two watered nights. Water again the morning after the first night.','water'],
        ['Harvest', 'Use a tool on the ripe plant or click it while you are nearby.','turnip'],
      ] },
      { title: 'Trade your harvest', steps: [
        ['Visit Mira’s Market', 'Follow the dirt road east, stand in front of the market, and interact.','shop'],
        ['Sell and buy', 'Choose Sell to earn gold from crops. Choose Buy to get more seeds.','gold'],
        ['Collect rewards', 'Open your journal after completing a quest to claim your reward.','book'],
      ] },
    ],
  },
};

export function tutorialPages(language: Language, touch: boolean) {
  const guide = guides[language];
  return [touch ? guide.touch : guide.keyboard, ...guide.shared];
}

import type { Language } from '../Config/language.ts';
import { ITEMS } from '../Items/catalog.ts';
import type { ItemId } from '../Items/catalog.ts';
import { MIRA } from '../NPC/mira.ts';
import { QUESTS } from '../Quests/quests.ts';
import type { QuestId } from '../Quests/quests.ts';
import { date, timeLabel } from '../Systems/clock.ts';
import type { Notice, NoticeKey } from '../Systems/notice.ts';

const english = {
  pageDescription: 'Grow a little farm of your own in Little Harvest Valley.',
  brandMenu: 'Little Harvest Valley menu', farmTools: 'Farm tools', pauseShortcut: 'Pause menu (Esc)',
  pauseMenu: 'Pause menu', farmArea: 'Little Harvest Valley farm', loading: 'Preparing the valley…',
  farmStatus: 'Farm status', mainMenu: 'Main menu', fieldJournal: 'Field Journal', valleyMap: 'Valley Map',
  cottage: 'Farm Cottage', market: 'Mira’s Market', pond: 'Willow Pond',
  restSave: 'Rest & save', buySell: 'Buy & sell', fishRefill: 'Fish & refill',
  toolBelt: 'Tool belt', move: 'Move', interact: 'Interact', click: 'Click', space: 'Space',
  useTool: 'Use tool', menu: 'Menu', localSave: 'Local save',
  farmAwaits: 'YOUR FARM AWAITS', welcome: 'A new season, a quiet valley, and a patch of land to call your own.',
  continueGame: 'Continue', newGame: 'New Game', settings: 'Settings',
  energy: 'Energy', wateringCan: 'Watering can', year: (value: number) => `Year ${value}`,
  rewardReady: 'Your reward is ready to claim.', tillHint: 'Till a square in the field with your hoe (1).',
  seedHint: 'Plant turnip seeds (6) in tilled soil.', harvestHint: 'Click a ripe crop to harvest it.',
  waterHint: 'Water planted soil with your can (2).', sleepHint: 'Rest at the cottage (E) to grow watered crops.',
  allCaughtUp: 'All caught up', allQuestsDone: 'Every valley quest is complete.', openJournal: 'Open Journal',
  slot: 'Slot', emptySlot: 'Empty slot', close: 'Close', inventory: 'Inventory', crafting: 'Crafting',
  journal: 'Journal', calendar: 'Calendar', createFarmer: 'Create Your Farmer', replaceFarm: 'Start a New Farm?',
  questJournal: 'Quest Journal', valleyCalendar: 'Valley Calendar', gameMenu: 'Game Menu', dayComplete: 'Day Complete',
  farmerPreview: 'Farmer preview', farmerName: 'Farmer name', farmName: 'Farm name', shirtColor: 'Shirt color',
  outfits: ['Clay', 'Blue', 'Olive', 'Plum'], beginSpring: 'Begin Spring',
  replaceWarning: 'Starting a new farm will replace the current local save when you begin Spring.',
  cancel: 'Cancel', createFarm: 'Create New Farm',
  equipHint: (slot: number) => `Select an item to put it in tool belt slot ${slot}.`,
  craftingHint: 'Use materials from your inventory to craft on the farm.', craft: 'Craft',
  reward: (gold: number) => `${gold} G reward`, claimed: 'Claimed', claim: 'Claim',
  weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  seasons: { Spring: 'Spring', Summer: 'Summer', Autumn: 'Autumn', Winter: 'Winter' },
  resume: 'Resume', returnToMenu: 'Return to Main Menu', saveGame: 'Save Game', saveAndReturn: 'Save & Return to Title',
  soundVolume: 'Sound effects volume', reduceMotion: 'Reduce motion', language: 'Language', done: 'Done',
  buy: 'Buy', sell: 'Sell', buyOne: 'Buy 1', sellOne: 'Sell 1',
  price: (rate: number, count: number) => `${rate} G each · ${count} in bag`,
  marketButton: 'Market', next: 'Next',
  sleepDescription: 'Rest until morning. Watered crops grow overnight, your energy and watering can refill, and your farm is saved.',
  keepFarming: 'Keep Farming', sleepUntilMorning: 'Sleep Until Morning',
  farmTitle: (name: string) => `${name} Farm`, goldEarned: 'Gold earned', goldSpent: 'Gold spent',
  cropsHarvested: 'Crops harvested', resourcesGathered: 'Resources gathered', startNextDay: 'Start the New Day',
  storageProgress: 'Browser storage is unavailable. Progress cannot be saved.',
  storageUnavailable: 'Browser storage is unavailable.', farmSaved: 'Farm saved.',
  fishBite: 'Bite! Click or press Space to reel in.', fishing: 'Fishing… wait for a bite.', reeledIn: 'Line reeled in.',
  interactCottage: 'E  ·  Rest at the cottage', interactMarket: 'E  ·  Open market', interactMira: 'E  ·  Talk to Mira',
  startToEquip: 'Start a farm to equip items.', enterNames: 'Enter a name for your farmer and farm.',
  purchased: 'Purchased', sold: 'Sold', harvested: 'Harvested', crafted: 'Crafted',
};

const vietnamese: typeof english = {
  pageDescription: 'Gieo trồng và chăm sóc nông trại của riêng bạn trong Little Harvest Valley.',
  brandMenu: 'Menu Little Harvest Valley', farmTools: 'Bảng điều khiển nông trại', pauseShortcut: 'Tạm dừng (Esc)',
  pauseMenu: 'Tạm dừng', farmArea: 'Nông trại Little Harvest Valley', loading: 'Đang chuẩn bị thung lũng…',
  farmStatus: 'Tình trạng nông trại', mainMenu: 'Menu chính', fieldJournal: 'Nhật ký nông trại', valleyMap: 'Bản đồ thung lũng',
  cottage: 'Nhà nông trại', market: 'Cửa hàng Mira', pond: 'Hồ Liễu',
  restSave: 'Nghỉ ngơi và lưu game', buySell: 'Mua và bán', fishRefill: 'Câu cá và lấy nước',
  toolBelt: 'Thanh công cụ', move: 'Di chuyển', interact: 'Tương tác', click: 'Chuột trái', space: 'Phím cách',
  useTool: 'Dùng công cụ', menu: 'Menu', localSave: 'Lưu trên trình duyệt',
  farmAwaits: 'NÔNG TRẠI ĐANG CHỜ BẠN', welcome: 'Mùa mới đã đến. Hãy chăm sóc mảnh đất của riêng bạn trong thung lũng yên bình.',
  continueGame: 'Tiếp tục', newGame: 'Chơi mới', settings: 'Cài đặt',
  energy: 'Thể lực', wateringCan: 'Bình tưới', year: value => `Năm ${value}`,
  rewardReady: 'Bạn đã có thể nhận thưởng.', tillHint: 'Dùng cuốc (1) để xới một ô trong luống.',
  seedHint: 'Gieo hạt củ cải (6) vào đất đã xới.', harvestHint: 'Nhấp vào cây đã lớn để thu hoạch.',
  waterHint: 'Dùng bình tưới (2) để tưới ô đã gieo.', sleepHint: 'Về nhà ngủ (E) để cây đã tưới lớn qua đêm.',
  allCaughtUp: 'Đã hoàn thành', allQuestsDone: 'Bạn đã hoàn thành mọi nhiệm vụ trong thung lũng.', openJournal: 'Mở nhật ký',
  slot: 'Ô', emptySlot: 'Ô trống', close: 'Đóng', inventory: 'Túi đồ', crafting: 'Chế tạo',
  journal: 'Nhật ký', calendar: 'Lịch', createFarmer: 'Tạo nhân vật', replaceFarm: 'Bắt đầu nông trại mới?',
  questJournal: 'Nhật ký nhiệm vụ', valleyCalendar: 'Lịch thung lũng', gameMenu: 'Menu tạm dừng', dayComplete: 'Tổng kết cuối ngày',
  farmerPreview: 'Xem trước nhân vật', farmerName: 'Tên nhân vật', farmName: 'Tên nông trại', shirtColor: 'Màu áo',
  outfits: ['Cam đất', 'Xanh lam', 'Xanh ô liu', 'Tím mận'], beginSpring: 'Bắt đầu mùa xuân',
  replaceWarning: 'Khi bạn bắt đầu mùa xuân ở nông trại mới, bản lưu hiện tại sẽ bị ghi đè.',
  cancel: 'Huỷ', createFarm: 'Tạo nông trại mới',
  equipHint: slot => `Chọn vật phẩm để gán vào ô số ${slot} trên thanh công cụ.`,
  craftingHint: 'Dùng nguyên liệu trong túi đồ để chế tạo vật phẩm.', craft: 'Chế tạo',
  reward: gold => `Thưởng ${gold} G`, claimed: 'Đã nhận', claim: 'Nhận thưởng',
  weekdays: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
  seasons: { Spring: 'Xuân', Summer: 'Hạ', Autumn: 'Thu', Winter: 'Đông' },
  resume: 'Chơi tiếp', returnToMenu: 'Về menu chính', saveGame: 'Lưu game', saveAndReturn: 'Lưu và về menu chính',
  soundVolume: 'Âm lượng hiệu ứng', reduceMotion: 'Giảm chuyển động', language: 'Ngôn ngữ', done: 'Xong',
  buy: 'Mua', sell: 'Bán', buyOne: 'Mua 1', sellOne: 'Bán 1',
  price: (rate, count) => `${rate} G mỗi món · Có ${count} trong túi`,
  marketButton: 'Cửa hàng', next: 'Tiếp',
  sleepDescription: 'Nghỉ đến sáng để cây đã tưới lớn qua đêm. Bạn sẽ hồi đầy thể lực, được châm đầy bình tưới và lưu tiến trình.',
  keepFarming: 'Làm tiếp', sleepUntilMorning: 'Ngủ đến sáng',
  farmTitle: name => `Nông trại ${name}`, goldEarned: 'Vàng kiếm được', goldSpent: 'Vàng đã chi',
  cropsHarvested: 'Nông sản đã thu hoạch', resourcesGathered: 'Tài nguyên đã thu thập', startNextDay: 'Bắt đầu ngày mới',
  storageProgress: 'Không thể dùng bộ nhớ trình duyệt để lưu tiến trình.',
  storageUnavailable: 'Không thể dùng bộ nhớ trình duyệt.', farmSaved: 'Đã lưu nông trại.',
  fishBite: 'Cá cắn câu! Nhấp chuột hoặc nhấn phím cách để kéo cần.', fishing: 'Đang câu cá… chờ cá cắn câu.', reeledIn: 'Đã thu dây câu.',
  interactCottage: 'E  ·  Nghỉ ngơi trong nhà', interactMarket: 'E  ·  Mở cửa hàng', interactMira: 'E  ·  Nói chuyện với Mira',
  startToEquip: 'Hãy bắt đầu chơi để gán vật phẩm vào thanh công cụ.', enterNames: 'Hãy nhập tên nhân vật và tên nông trại.',
  purchased: 'Đã mua', sold: 'Đã bán', harvested: 'Đã thu hoạch', crafted: 'Đã chế tạo',
};

const viItems: Record<ItemId, [name: string, note: string]> = {
  hoe: ['Cuốc đồng', 'Dùng để xới đất trong luống.'],
  can: ['Bình tưới', 'Tưới ô đất đã xới. Có thể lấy thêm nước ở hồ.'],
  axe: ['Rìu', 'Dùng để chặt cây nhỏ và gốc cây.'],
  pick: ['Cuốc chim', 'Dùng để đập đá.'],
  rod: ['Cần câu', 'Thả câu từ bờ hồ. Kéo cần khi cá cắn câu.'],
  turnipSeed: ['Hạt củ cải', 'Có thể thu hoạch sau hai đêm được tưới.'],
  carrotSeed: ['Hạt cà rốt', 'Có thể thu hoạch sau ba đêm được tưới.'],
  turnip: ['Củ cải', 'Củ cải giòn, thường trồng vào mùa xuân.'],
  carrot: ['Cà rốt', 'Vị ngọt và bán được vài đồng vàng hơn củ cải.'],
  wood: ['Gỗ', 'Nguyên liệu chế tạo thu được khi chặt cây.'],
  stone: ['Đá', 'Nguyên liệu chế tạo các vật dụng chắc chắn.'],
  fish: ['Cá rô hồ', 'Một loài cá nhỏ câu được trong hồ.'],
  fence: ['Bộ hàng rào', 'Có thể đặt trên một ô cỏ trống.'],
  snack: ['Củ cải ăn nhẹ', 'Ăn để hồi 30 thể lực.'],
};

const viKinds: Record<(typeof ITEMS)[ItemId]['kind'], string> = {
  Tool: 'Công cụ', Seed: 'Hạt giống', Crop: 'Nông sản', Material: 'Nguyên liệu',
  Fish: 'Cá', Build: 'Vật dụng', Food: 'Thức ăn',
};

const viQuests: Record<QuestId, [title: string, detail: string]> = {
  first: ['Vụ mùa đầu tiên', 'Thu hoạch 3 củ cải để bắt đầu phát triển nông trại.'],
  pond: ['Một buổi sáng yên bình', 'Câu 2 con cá rô ở Hồ Liễu.'],
  fence: ['Hàng rào vững chắc', 'Chế tạo 2 bộ hàng rào cho nông trại.'],
};

const viMira: string[] = [
  'Chào mừng bạn đến thung lũng! Luống trồng ở ngay phía nam nhà. Xới đất, gieo hạt rồi nhớ tưới nước trước khi ngủ nhé.',
  'Củ cải cần hai đêm được tưới mới lớn. Bạn có thể ghé quầy của mình để bán nông sản hoặc mua thêm hạt giống.',
  'Hồ mùa này yên ả lắm. Hãy đứng trên bờ thả câu và kéo cần ngay khi cá cắn câu.',
];

const notices: Record<NoticeKey, [en: string, vi: string]> = {
  unavailableTrade: ['Mira does not trade that item.', 'Mira không mua bán vật phẩm này.'],
  needGold: ['You need more gold.', 'Bạn không đủ vàng.'],
  noStock: ['Your bag is empty of that item.', 'Bạn không có vật phẩm này trong túi.'],
  unavailableRecipe: ['That recipe is unavailable.', 'Công thức này chưa có.'],
  needMaterials: ['Gather the required materials first.', 'Bạn cần thu thập đủ nguyên liệu.'],
  unfinishedQuest: ['Complete the quest before claiming its reward.', 'Hãy hoàn thành nhiệm vụ trước khi nhận thưởng.'],
  approachLandmark: ['Walk up to the cottage, Mira, or the seed shop.', 'Hãy đến gần nhà, Mira hoặc cửa hàng hạt giống.'],
  fullEnergy: ['Your energy is already full.', 'Thể lực của bạn đã đầy.'],
  restoredEnergy: ['Restored up to 30 energy.', 'Đã hồi tối đa 30 thể lực.'],
  waitForBite: ['Wait for the bite before reeling in.', 'Chờ cá cắn câu rồi hãy kéo cần.'],
  fishEscaped: ['The fish slipped away. Try another cast.', 'Cá thoát mất rồi. Hãy thả câu lần nữa.'],
  fishCaught: ['Caught a Pond Perch!', 'Bạn đã câu được cá rô hồ!'],
  moveCloser: ['Move a little closer.', 'Hãy đến gần thêm một chút.'],
  outOfEnergy: ['You are out of energy. Rest at the cottage.', 'Bạn đã hết thể lực. Hãy về nhà nghỉ ngơi.'],
  selectTool: ['Select an available tool or seed.', 'Hãy chọn công cụ hoặc hạt giống có sẵn.'],
  castLine: ['Line cast. Wait for the bite!', 'Đã thả câu. Hãy chờ cá cắn câu!'],
  aimAtPond: ['Stand by the pond and aim at the water.', 'Hãy đứng cạnh hồ và nhắm vào mặt nước.'],
  canRefilled: ['Watering can refilled.', 'Đã châm đầy bình tưới.'],
  oneMoreHit: ['One more hit.', 'Cần thêm một lần nữa.'],
  fencePickedUp: ['Fence picked up.', 'Đã thu lại hàng rào.'],
  chooseGrass: ['Choose a free grass tile.', 'Hãy chọn một ô cỏ trống.'],
  fencePlaced: ['Fence placed.', 'Đã đặt hàng rào.'],
  soilTilled: ['Soil tilled.', 'Đã xới đất.'],
  emptyPlot: ['Choose an empty tilled tile.', 'Hãy chọn một ô đất đã xới còn trống.'],
  seedPlanted: ['Seed planted.', 'Đã gieo hạt.'],
  alreadyWatered: ['This soil is already watered.', 'Ô đất này đã được tưới.'],
  aimCan: ['Aim at tilled soil or the pond.', 'Hãy nhắm vào đất đã xới hoặc mặt hồ.'],
  emptyCan: ['Refill at Willow Pond or rest overnight.', 'Hãy lấy nước ở Hồ Liễu hoặc nghỉ qua đêm.'],
  soilWatered: ['Soil watered.', 'Đã tưới nước.'],
  tillInsideField: ['Till a free square inside the farm plot.', 'Hãy xới một ô trống trong luống.'],
  wrongTool: ['Choose a matching tool and target.', 'Hãy chọn công cụ phù hợp với ô đang nhắm.'],
};

export function createLocale(language: Language) {
  const vi = language === 'vi';
  const text = vi ? vietnamese : english;
  const item = (id: ItemId) => vi
    ? { name: viItems[id][0], kind: viKinds[ITEMS[id].kind], note: viItems[id][1] }
    : ITEMS[id];
  const quest = (entry: typeof QUESTS[number]) => vi
    ? { title: viQuests[entry.id][0], detail: viQuests[entry.id][1] }
    : entry;
  return {
    language, text, item, quest,
    lines: vi ? viMira : MIRA.lines,
    number: new Intl.NumberFormat(vi ? 'vi-VN' : 'en-US'),
    day(day: number) {
      const current = date(day);
      const season = text.seasons[current.season];
      return { ...current, season, label: `${season} ${current.number}` };
    },
    time(minutes: number) {
      if (!vi) return timeLabel(minutes);
      return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(Math.floor(minutes % 60)).padStart(2, '0')}`;
    },
    notice(notice: Notice) {
      if (typeof notice === 'string') return notices[notice][vi ? 1 : 0];
      switch (notice.kind) {
        case 'purchased': case 'sold': case 'harvested':
          return `${text[notice.kind]} · ${item(notice.item).name}`;
        case 'crafted':
          return `${text.crafted} ${notice.count} · ${item(notice.item).name}`;
        case 'gathered':
          return `+${notice.count} ${item(notice.item).name}`;
        case 'claimed': {
          const entry = QUESTS.find(entry => entry.id === notice.quest)!;
          return `${quest(entry).title} · +${notice.reward} G`;
        }
      }
    },
  };
}
export type Locale = ReturnType<typeof createLocale>;

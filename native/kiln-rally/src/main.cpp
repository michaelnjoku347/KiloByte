// Kiln Rally — an original mashup of a brick-stacking workshop and a puck sport.
// No commercial titles, assets, or mechanics were copied. Draw with SDL primitives only.
//
// Slide the cart. Catch falling bricks to widen it. Bank the spark into the kiln mouth.

#include <SDL2/SDL.h>

#include <emscripten.h>
#include <emscripten/html5.h>

#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <cstring>
#include <vector>

namespace {

constexpr int W = 960;
constexpr int H = 540;
constexpr float CART_Y = 492.f;
constexpr float CART_H = 16.f;
constexpr float STACK_Y = 404.f;
constexpr float PUCK_R = 11.f;

struct Brick {
  float x, y, w, h, vy;
  bool falling;
};

struct Game {
  SDL_Window* window = nullptr;
  SDL_Renderer* renderer = nullptr;
  float cartX = 420.f;
  float cartSpeed = 0.f;
  float widthBonus = 28.f;
  bool left = false;
  bool right = false;
  bool catchQueued = false;
  float puckX = 460.f;
  float puckY = 210.f;
  float puckVX = 150.f;
  float puckVY = 40.f;
  int score = 0;
  int misses = 0;
  int caught = 0;
  bool armed = false;
  bool over = false;
  float flash = 0.f;
  float spawn = 0.4f;
  Uint32 last = 0;
  std::vector<Brick> bricks;
};

Game game;

float clampf(float v, float a, float b) { return std::max(a, std::min(b, v)); }

float cartWidth() { return std::min(210.f, 76.f + game.widthBonus); }

void serve() {
  float width = cartWidth();
  game.puckX = game.cartX + width * 0.5f;
  game.puckY = CART_Y - 80.f;
  game.puckVX = (std::rand() % 2 == 0) ? 90.f : -80.f;
  game.puckVY = -260.f;
}

void reset() {
  game.cartX = 400.f;
  game.cartSpeed = 0.f;
  game.widthBonus = 28.f;
  game.left = false;
  game.right = false;
  game.catchQueued = false;
  game.score = 0;
  game.misses = 0;
  game.caught = 0;
  game.armed = false;
  game.over = false;
  game.flash = 0.f;
  game.spawn = 0.35f;
  game.bricks.clear();
  Brick settled{180.f, STACK_Y, 44.f, 18.f, 0.f, false};
  Brick falling{560.f, 150.f, 40.f, 18.f, 80.f, true};
  game.bricks.push_back(settled);
  game.bricks.push_back(falling);
  serve();
  std::srand(1);
}

void setColor(unsigned hex, Uint8 a = 255) {
  SDL_SetRenderDrawColor(game.renderer, (hex >> 16) & 255, (hex >> 8) & 255, hex & 255, a);
}

void fillRect(float x, float y, float w, float h) {
  SDL_Rect r{static_cast<int>(x), static_cast<int>(y), static_cast<int>(w), static_cast<int>(h)};
  SDL_RenderFillRect(game.renderer, &r);
}

void fillCircle(float cx, float cy, float rad) {
  int r = static_cast<int>(rad);
  int icx = static_cast<int>(cx);
  int icy = static_cast<int>(cy);
  for (int y = -r; y <= r; ++y) {
    int span = static_cast<int>(std::sqrt(static_cast<float>(r * r - y * y)));
    SDL_RenderDrawLine(game.renderer, icx - span, icy + y, icx + span, icy + y);
  }
}

// 3x5 glyphs, row-major. Enough for the score and a short end card.
const char* glyph(char ch) {
  switch (ch) {
    case '0': return "111101101101111";
    case '1': return "010110010010111";
    case '2': return "111001111100111";
    case '3': return "111001111001111";
    case '4': return "101101111001001";
    case '5': return "111100111001111";
    case '6': return "111100111101111";
    case '7': return "111001010010010";
    case '8': return "111101111101111";
    case '9': return "111101111001111";
    case 'R': return "110101110101101";
    case 'E': return "111100111100111";
    case 'S': return "111100111001111";
    case 'T': return "111010010010010";
    case 'A': return "111101111101101";
    case 'O': return "111101101101111";
    case 'U': return "101101101101111";
    default: return "000000000000000";
  }
}

void drawText(const char* text, float x, float y, int scale, unsigned hex) {
  setColor(hex);
  float cx = x;
  for (const char* p = text; *p; ++p) {
    if (*p == ' ') {
      cx += 4.f * scale;
      continue;
    }
    const char* g = glyph(*p);
    for (int i = 0; i < 15; ++i) {
      if (g[i] != '1') continue;
      fillRect(cx + (i % 3) * scale, y + (i / 3) * scale, static_cast<float>(scale), static_cast<float>(scale));
    }
    cx += 4.f * scale;
  }
}

int settledCount() {
  int n = 0;
  for (const auto& b : game.bricks)
    if (!b.falling) ++n;
  return n;
}

float restY(const Brick& brick) {
  float y = STACK_Y;
  for (const auto& other : game.bricks) {
    if (&other == &brick || other.falling) continue;
    bool overlap = brick.x < other.x + other.w - 2.f && brick.x + brick.w > other.x + 2.f;
    if (!overlap) continue;
    y = std::min(y, other.y - brick.h);
  }
  return y;
}

bool circleHits(float cx, float cy, float r, float rx, float ry, float rw, float rh, float& nx, float& ny,
                float& pen) {
  float nearestX = clampf(cx, rx, rx + rw);
  float nearestY = clampf(cy, ry, ry + rh);
  float dx = cx - nearestX;
  float dy = cy - nearestY;
  float d2 = dx * dx + dy * dy;
  if (d2 > r * r) return false;
  if (d2 > 0.01f) {
    float d = std::sqrt(d2);
    nx = dx / d;
    ny = dy / d;
    pen = r - d;
    return true;
  }
  float left = cx - rx;
  float right = rx + rw - cx;
  float top = cy - ry;
  float bot = ry + rh - cy;
  float best = left;
  nx = -1.f;
  ny = 0.f;
  if (right < best) {
    best = right;
    nx = 1.f;
    ny = 0.f;
  }
  if (top < best) {
    best = top;
    nx = 0.f;
    ny = -1.f;
  }
  if (bot < best) {
    best = bot;
    nx = 0.f;
    ny = 1.f;
  }
  pen = best + r;
  return true;
}

void bounceOff(float rx, float ry, float rw, float rh, float rest) {
  float nx, ny, pen;
  if (!circleHits(game.puckX, game.puckY, PUCK_R, rx, ry, rw, rh, nx, ny, pen)) return;
  game.puckX += nx * (pen + 0.6f);
  game.puckY += ny * (pen + 0.6f);
  float velN = game.puckVX * nx + game.puckVY * ny;
  if (velN < 0.f) {
    game.puckVX -= (1.f + rest) * velN * nx;
    game.puckVY -= (1.f + rest) * velN * ny;
  }
}

void tryCatch() {
  float width = cartWidth();
  int best = -1;
  float bestY = -1.f;
  for (int i = 0; i < static_cast<int>(game.bricks.size()); ++i) {
    const Brick& b = game.bricks[i];
    if (!b.falling) continue;
    bool overlap = b.x < game.cartX + width && b.x + b.w > game.cartX;
    float gap = CART_Y - (b.y + b.h);
    if (!overlap || gap > 72.f || gap < -10.f) continue;
    if (b.y > bestY) {
      best = i;
      bestY = b.y;
    }
  }
  if (best < 0) return;
  game.bricks.erase(game.bricks.begin() + best);
  game.widthBonus = std::min(140.f, game.widthBonus + 24.f);
  game.caught += 1;
  game.flash = 0.18f;
}

void update(float dt) {
  if (game.flash > 0.f) game.flash = std::max(0.f, game.flash - dt);

  if (!game.armed && !game.over) {
    float width = cartWidth();
    float target = game.puckX - width * 0.5f;
    game.cartX += (target - game.cartX) * std::min(1.f, dt * 3.5f);
  }
  float axis = 0.f;
  if (game.left) axis -= 1.f;
  if (game.right) axis += 1.f;
  if (axis != 0.f) game.cartSpeed += axis * 2400.f * dt;
  else {
    float friction = 1800.f * dt;
    if (std::fabs(game.cartSpeed) <= friction) game.cartSpeed = 0.f;
    else game.cartSpeed -= std::copysign(friction, game.cartSpeed);
  }
  game.cartSpeed = clampf(game.cartSpeed, -540.f, 540.f);
  game.cartX += game.cartSpeed * dt;
  float width = cartWidth();
  game.cartX = clampf(game.cartX, 18.f, W - 18.f - width);
  game.widthBonus = std::max(0.f, game.widthBonus - 7.f * dt);

  if (!game.over && game.catchQueued) tryCatch();
  game.catchQueued = false;

  if (!game.over && settledCount() < 14) {
    game.spawn -= dt;
    if (game.spawn <= 0.f) {
      game.spawn = std::max(0.72f, 1.45f - game.score * 0.06f);
      Brick b;
      b.w = 40.f;
      b.h = 18.f;
      b.x = 36.f + static_cast<float>(std::rand() % (W - 180));
      b.y = 76.f;
      b.vy = 78.f + game.score * 8.f;
      b.falling = true;
      game.bricks.push_back(b);
    }
  }

  for (auto& b : game.bricks) {
    if (!b.falling) continue;
    b.y += b.vy * dt;
    float land = restY(b);
    if (land < 96.f) {
      b.falling = false;
      b.y = -100.f;
      continue;
    }
    if (b.y >= land) {
      b.y = land;
      b.vy = 0.f;
      b.falling = false;
    }
  }
  game.bricks.erase(std::remove_if(game.bricks.begin(), game.bricks.end(),
                                    [](const Brick& b) { return !b.falling && b.y < 0.f; }),
                    game.bricks.end());

  if (game.over) return;

  const int steps = 2;
  float step = dt / static_cast<float>(steps);
  for (int s = 0; s < steps; ++s) {
    game.puckVY += 560.f * step;
    game.puckX += game.puckVX * step;
    game.puckY += game.puckVY * step;

    bool inKiln = game.puckX > W - 112.f && game.puckY > 46.f && game.puckY < 132.f;
    if (inKiln) {
      game.score += 1;
      game.flash = 0.35f;
      serve();
      break;
    }

    if (game.puckX < 22.f + PUCK_R) {
      game.puckX = 22.f + PUCK_R;
      game.puckVX = std::fabs(game.puckVX);
    }
    if (game.puckX > W - 22.f - PUCK_R && (game.puckY < 46.f || game.puckY > 132.f)) {
      game.puckX = W - 22.f - PUCK_R;
      game.puckVX = -std::fabs(game.puckVX);
    }
    if (game.puckY < 62.f + PUCK_R) {
      game.puckY = 62.f + PUCK_R;
      game.puckVY = std::fabs(game.puckVY);
    }

    for (const auto& b : game.bricks) bounceOff(b.x, b.y, b.w, b.h, 0.72f);

    width = cartWidth();
    bool onCart = game.puckVY > 0.f && game.puckY + PUCK_R >= CART_Y && game.puckY < CART_Y + CART_H &&
                  game.puckX > game.cartX - 4.f && game.puckX < game.cartX + width + 4.f;
    if (onCart) {
      float hit = ((game.puckX - game.cartX) / width) * 2.f - 1.f;
      game.puckY = CART_Y - PUCK_R - 0.5f;
      game.puckVY = -std::max(240.f, std::fabs(game.puckVY) * 1.02f);
      game.puckVX += hit * 280.f + game.cartSpeed * 0.25f;
    }

    float speed = std::sqrt(game.puckVX * game.puckVX + game.puckVY * game.puckVY);
    if (speed > 620.f) {
      game.puckVX *= 620.f / speed;
      game.puckVY *= 620.f / speed;
    }
  }

  if (game.puckY > H + 24.f) {
    if (!game.armed) serve();
    else {
      game.misses += 1;
      if (game.misses >= 5) game.over = true;
      else serve();
    }
  }
}

void drawBrick(const Brick& b) {
  setColor(b.falling ? 0xF0944A : 0xE07A3D);
  fillRect(b.x, b.y, b.w, b.h);
  setColor(0x8C3E16);
  fillRect(b.x, b.y + b.h - 3.f, b.w, 3.f);
  setColor(0xFFD0A4);
  fillRect(b.x + 3.f, b.y + 3.f, b.w - 8.f, 3.f);
}

void draw() {
  setColor(0x1C120C);
  SDL_RenderClear(game.renderer);

  setColor(0x2A1B12);
  fillRect(0, 56, W, H - 56);
  setColor(0x3A2618);
  for (int i = 0; i < 8; ++i) fillRect(40.f + i * 120.f, 70.f, 2.f, H - 90.f);

  // Kiln mouth: the goal. The right wall has a gap here.
  setColor(0x3A2418);
  fillRect(W - 128.f, 28.f, 128.f, 120.f);
  setColor(game.flash > 0.2f ? 0xFFD29A : 0xFF6A2A);
  fillRect(W - 108.f, 46.f, 86.f, 86.f);
  setColor(0x2A120C);
  fillRect(W - 86.f, 64.f, 46.f, 52.f);
  setColor(0xC9B29A);
  fillRect(W - 70.f, 16.f, 22.f, 18.f);

  for (const auto& b : game.bricks)
    if (!b.falling) drawBrick(b);
  for (const auto& b : game.bricks)
    if (b.falling) drawBrick(b);

  float width = cartWidth();
  setColor(0xC9B59A);
  fillRect(game.cartX + 8.f, CART_Y + 12.f, width - 16.f, 6.f);
  setColor(0xF3EAD7);
  fillRect(game.cartX, CART_Y, width, CART_H);
  setColor(0x2A1B12);
  fillCircle(game.cartX + 14.f, CART_Y + CART_H + 4.f, 5.f);
  fillCircle(game.cartX + width - 14.f, CART_Y + CART_H + 4.f, 5.f);

  setColor(0xE7A23A);
  fillCircle(game.puckX, game.puckY, PUCK_R + 3.f);
  setColor(0xFFE08A);
  fillCircle(game.puckX, game.puckY, PUCK_R);
  setColor(0xFFF6D0);
  fillCircle(game.puckX - 3.f, game.puckY - 3.f, 3.f);

  char score[16];
  SDL_snprintf(score, sizeof(score), "%d", game.score);
  drawText(score, 24.f, 16.f, 4, 0xF3EAD7);
  for (int i = 0; i < 5; ++i) {
    setColor(i < 5 - game.misses ? 0xFF6A2A : 0x4A3428);
    fillCircle(150.f + i * 22.f, 28.f, 6.f);
  }
  drawText(game.armed ? "SPACE CATCH" : "ARROWS TO PLAY", 520.f, 18.f, 2, 0xC9B29A);

  if (game.over) {
    SDL_SetRenderDrawBlendMode(game.renderer, SDL_BLENDMODE_BLEND);
    setColor(0x120C08, 210);
    fillRect(0, 0, W, H);
    SDL_SetRenderDrawBlendMode(game.renderer, SDL_BLENDMODE_NONE);
    drawText("OUT", 400.f, 210.f, 8, 0xF3EAD7);
    drawText(score, 430.f, 280.f, 5, 0xFFB15A);
    drawText("R", 456.f, 340.f, 4, 0xC9B29A);
  }

  SDL_RenderPresent(game.renderer);
}

void frame() {
  Uint32 now = SDL_GetTicks();
  float dt = (now - game.last) / 1000.f;
  game.last = now;
  if (dt < 0.f || dt > 0.033f) dt = 0.033f;

  SDL_Event ev;
  while (SDL_PollEvent(&ev)) {
    if (ev.type == SDL_MOUSEBUTTONDOWN) {
      if (game.over) {
        reset();
        continue;
      }
      game.armed = true;
      if (ev.button.y < 120) game.catchQueued = true;
    } else if (ev.type == SDL_MOUSEMOTION && (ev.motion.state & SDL_BUTTON_LMASK) && !game.over) {
      game.armed = true;
      game.cartX = ev.motion.x - cartWidth() * 0.5f;
    } else if ((ev.type == SDL_FINGERDOWN || ev.type == SDL_FINGERMOTION) && !game.over) {
      game.armed = true;
      float x = ev.tfinger.x * W;
      float y = ev.tfinger.y * H;
      if (ev.type == SDL_FINGERDOWN && y < 160.f) game.catchQueued = true;
      else game.cartX = x - cartWidth() * 0.5f;
    }
  }

  update(dt);
  draw();
}

EM_BOOL onKey(int type, const EmscriptenKeyboardEvent* e, void*) {
  bool down = type == EMSCRIPTEN_EVENT_KEYDOWN;
  const char* k = e->key;
  auto same = [&](const char* a) { return std::strcmp(k, a) == 0; };
  if (same("ArrowLeft") || same("a") || same("A")) {
    if (down) game.armed = true;
    game.left = down;
    return EM_TRUE;
  }
  if (same("ArrowRight") || same("d") || same("D")) {
    if (down) game.armed = true;
    game.right = down;
    return EM_TRUE;
  }
  if (same(" ") || same("Spacebar")) {
    if (down && !e->repeat) {
      game.armed = true;
      game.catchQueued = true;
    }
    return EM_TRUE;
  }
  if (down && (same("r") || same("R")) && game.over) {
    reset();
    return EM_TRUE;
  }
  return EM_FALSE;
}

}  // namespace

int main() {
  SDL_Init(SDL_INIT_VIDEO | SDL_INIT_TIMER);
  SDL_CreateWindowAndRenderer(W, H, SDL_WINDOW_RESIZABLE, &game.window, &game.renderer);
  SDL_RenderSetLogicalSize(game.renderer, W, H);
  emscripten_set_keydown_callback(EMSCRIPTEN_EVENT_TARGET_DOCUMENT, nullptr, true, onKey);
  emscripten_set_keyup_callback(EMSCRIPTEN_EVENT_TARGET_DOCUMENT, nullptr, true, onKey);
  reset();
  game.last = SDL_GetTicks();
  emscripten_set_main_loop(frame, 0, 1);
  return 0;
}

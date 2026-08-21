# Niulai Prompt Specification

Use this reference whenever generating or editing a Niulai avatar.

## Image Roles

- Image 1: dominant character and style reference from `assets/niulai-reference.png`.
- Image 2: user-provided avatar supplying identity cues only.

State these roles explicitly. Do not describe the user avatar as the dominant style reference.

## Transformation Strength

| Strength | Target balance | Keep from the uploaded avatar |
|---|---:|---|
| `light` | 55% Niulai / 45% avatar | Several facial, hair, clothing, and palette cues |
| `standard` | 70% Niulai / 30% avatar | Two to four signature cues |
| `strong` | 85% Niulai / 15% avatar | One or two unmistakable cues |

Use `standard` unless the user specifies otherwise.

## Niulai Invariants

Preserve:

- Tall horns with blue or blue-violet tips.
- Small side ears.
- Narrow, sleepy, unfocused eyes.
- A broad, elongated blue-violet bovine muzzle.
- A calm, vacant, awkward expression.
- Muted olive-tan skin and a warm yellow-orange background.
- Primitive early-3D rendering, soft blur, color bleed, washed-out contrast, compression noise, and
  an accidental old-screenshot feeling.
- Slight asymmetry and imperfect framing.

Avoid:

- A polished studio mascot, glossy cinematic 3D, photorealistic fur, or crisp vector art.
- A generic cute cow, aggressive bull, human nose, human face, or anime-only rendering.
- Extra horns, eyes, ears, limbs, characters, text, watermarks, or cropped horn tips.
- Cleaning up the image so much that it loses its meme quality.

## User Trait Selection

Preserve two to four high-signal features. Prefer this order:

1. Hair silhouette or headwear.
2. Glasses or a distinctive eye color.
3. Clothing silhouette or one accessory.
4. A dominant color pair.
5. Expression or pose when it does not conflict with Niulai anatomy.

Do not reproduce incidental text, signatures, usernames, or watermarks from the upload.

## Binance Theme

Apply only when explicitly requested. Preserve the Niulai meme first, then add no more than two of:

- A small low-resolution black badge with a yellow Binance geometric diamond.
- Muted yellow-and-black highlights on clothing or background shapes.
- A faint blurred Binance diamond in the background.
- Subtle square-pixel transition artifacts in yellow and charcoal.

Do not turn the image into a polished corporate logo. Do not add the word "Binance" or claim
official affiliation.

## Base Prompt

Use this structure and replace bracketed values:

```text
Create a square social-profile avatar using two image references.

Image 1 is the dominant Niulai character and lo-fi meme-style reference. Preserve its tall
blue-tipped horns, small ears, sleepy eyes, long blue-violet muzzle, awkward expression, muted
olive skin, warm yellow background, primitive early-3D blur, color bleed, and compression noise.

Image 2 is the user's avatar. Preserve only these recognizable traits: [TRAITS]. Use a
[STRENGTH_BALANCE] transformation. Keep one centered anthropomorphic bull, with the complete horns
inside the frame and a face readable at 64px.

[THEME_INSTRUCTIONS]

Do not add text, captions, usernames, watermarks, extra characters, extra horns, extra eyes,
photorealistic human anatomy, or polished modern mascot rendering.
```

## Visual QA

Confirm all of the following before delivery:

- The result is square and at least 512×512.
- The character is unmistakably Niulai at thumbnail size.
- Two to four requested user traits remain visible.
- The horns are complete and the muzzle is bovine.
- The original low-resolution meme character is preserved.
- No unrequested text, watermark, or additional character appears.

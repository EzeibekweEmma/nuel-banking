import {
  createSocialPreviewImage,
  socialImageSize,
} from "./social-preview-image";

export const alt =
  "Nuel Bank — secure digital banking with intelligent fraud monitoring";
export const size = socialImageSize;
export const contentType = "image/png";

export default function TwitterImage() {
  return createSocialPreviewImage();
}

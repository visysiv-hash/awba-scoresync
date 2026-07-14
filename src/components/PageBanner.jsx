const BANNER_URL = "https://media.base44.com/images/public/69c519111fbf9fefe3d69538/83f77bd4f_image.png";

export default function PageBanner({ className = "h-16 mb-4" }) {
  return (
    <img
      src={BANNER_URL}
      alt="Albury Wodonga Badminton Association"
      className={`mx-auto object-contain ${className}`}
    />
  );
}
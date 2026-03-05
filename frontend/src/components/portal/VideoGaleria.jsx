import React, { useEffect, useMemo, useState } from "react";
import { getVideos } from "../../services/portalContentApi";

function toYouTubeEmbed(url) {
  // acepta:
  // - https://www.youtube.com/watch?v=ID
  // - https://youtu.be/ID
  // - https://www.youtube.com/embed/ID
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return url;
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

function toVimeoEmbed(url) {
  // acepta:
  // - https://vimeo.com/ID
  // - https://player.vimeo.com/video/ID
  try {
    const u = new URL(url);
    if (u.hostname.includes("player.vimeo.com") && u.pathname.includes("/video/")) {
      return url;
    }
    if (u.hostname.includes("vimeo.com")) {
      const parts = u.pathname.split("/").filter(Boolean);
      const id = parts[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

function toEmbedUrl(url) {
  if (!url) return null;
  return toYouTubeEmbed(url) || toVimeoEmbed(url) || null;
}

const VideoCard = ({ item }) => {
  const embedUrl = useMemo(() => toEmbedUrl(item?.url_externa), [item]);
  const hasExternal = Boolean(item?.url_externa);
  const hasFile = Boolean(item?.archivo_video_url);

  return (
    <article className="overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm">
      {/* Media */}
      <div className="bg-slate-100">
        {hasExternal ? (
          embedUrl ? (
            <div className="relative w-full aspect-video">
              <iframe
                className="absolute inset-0 h-full w-full"
                src={embedUrl}
                title="Video externo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : item?.portada_url ? (
            <div className="relative w-full aspect-video">
              <img
                src={item.portada_url}
                alt="Portada"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                <a
                  href={item.url_externa}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:opacity-90"
                >
                  Abrir video
                </a>
              </div>
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center p-6 text-sm text-slate-500">
              Video externo sin embed/portada
              <a
                className="ml-2 underline"
                href={item.url_externa}
                target="_blank"
                rel="noreferrer"
              >
                abrir
              </a>
            </div>
          )
        ) : hasFile ? (
          <video
            className="w-full aspect-video bg-black"
            controls
            preload="metadata"
            poster={item?.portada_url || undefined}
            src={item.archivo_video_url}
          />
        ) : item?.portada_url ? (
          <img
            src={item.portada_url}
            alt="Portada"
            className="w-full aspect-video object-cover"
          />
        ) : (
          <div className="flex aspect-video items-center justify-center p-6 text-sm text-slate-500">
            Sin fuente de video
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4">
        <p className="text-xs text-slate-500">
          {hasExternal ? "Fuente: URL externa" : hasFile ? "Fuente: Archivo" : "Fuente: -"}
        </p>
        {item?.url_externa && (
          <p className="mt-1 text-xs text-slate-600 truncate">{item.url_externa}</p>
        )}
      </div>
    </article>
  );
};

const VideoGaleria = () => {
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getVideos();
        if (!mounted) return;
        setVideos(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Error cargando videos");
        setVideos([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section id="videos" className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-[#2f7ecb]">
            Video galerías
          </h2>
          <p className="mt-4 text-sm text-slate-500">
            Contenido audiovisual actualizado desde el portal.
          </p>
        </div>

        <div className="mt-10">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-video rounded-xl bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          ) : videos.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
              No hay videos activos para mostrar.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {videos.map((v) => (
                <VideoCard key={v.id} item={v} />
              ))}
            </div>
          )}

          {error && (
            <p className="mt-4 text-center text-xs text-red-600">{error}</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default VideoGaleria;
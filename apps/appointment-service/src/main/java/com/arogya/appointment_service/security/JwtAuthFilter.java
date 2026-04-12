@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        // The Gateway already verified the JWT and forwarded decoded
        // user info as headers. We trust these because they only come
        // from the internal Docker network — no external client can set them.
        String userId = request.getHeader("x-user-id");
        String role   = request.getHeader("x-user-role");
        String email  = request.getHeader("x-user-email");

        if (userId != null && role != null) {
            // Build Spring Security context from the trusted headers
            UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(
                    userId,
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
                );
            auth.setDetails(Map.of("email", email, "role", role));
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        chain.doFilter(request, response);
    }
}
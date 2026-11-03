import "package:flutter/material.dart";
import "package:provider/provider.dart";
import "../state/app_state.dart";
import "../theme.dart";

class AuthScreen extends StatefulWidget {
  final String initialRole;
  const AuthScreen({super.key, this.initialRole = "tenant"});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  late String role = widget.initialRole;
  bool signUp = false;
  bool loading = false;
  String? error;

  final nameCtrl = TextEditingController();
  final emailCtrl = TextEditingController();
  final phoneCtrl = TextEditingController();
  final passwordCtrl = TextEditingController();
  final formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    nameCtrl.dispose();
    emailCtrl.dispose();
    phoneCtrl.dispose();
    passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (!formKey.currentState!.validate()) return;
    setState(() { loading = true; error = null; });
    final state = context.read<AppState>();
    final err = signUp
        ? await state.register(nameCtrl.text.trim(), emailCtrl.text.trim(), phoneCtrl.text.trim(), passwordCtrl.text, role)
        : await state.login(emailCtrl.text.trim(), passwordCtrl.text);
    if (!mounted) return;
    setState(() { loading = false; error = err; });
    if (err == null) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(signUp ? "Join WAZI" : "Welcome back")),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  signUp ? "Create an account to post houses or save your search." : "Sign in to manage listings or your saved homes.",
                  style: const TextStyle(color: WaziColors.inkSoft, fontSize: 13.5),
                ),
                const SizedBox(height: 18),
                Row(children: [
                  Expanded(child: _RoleButton(label: "I'm a tenant", selected: role == "tenant", onTap: () => setState(() => role = "tenant"))),
                  const SizedBox(width: 8),
                  Expanded(child: _RoleButton(label: "I'm an owner", selected: role == "owner", onTap: () => setState(() => role = "owner"))),
                ]),
                const SizedBox(height: 18),
                if (error != null) Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: const Color(0xFFF7E4DE), borderRadius: BorderRadius.circular(8)),
                    child: Text(error!, style: const TextStyle(color: Color(0xFF9C3A2B), fontSize: 13)),
                  ),
                ),
                if (signUp) ...[
                  const _Label("Full name"),
                  TextFormField(controller: nameCtrl, validator: (v) => (v == null || v.trim().isEmpty) ? "Required" : null),
                  const SizedBox(height: 14),
                ],
                const _Label("Email"),
                TextFormField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  validator: (v) => (v == null || !v.contains("@")) ? "Enter a valid email" : null,
                ),
                const SizedBox(height: 14),
                if (signUp) ...[
                  const _Label("Phone"),
                  TextFormField(controller: phoneCtrl, keyboardType: TextInputType.phone),
                  const SizedBox(height: 14),
                ],
                const _Label("Password"),
                TextFormField(
                  controller: passwordCtrl,
                  obscureText: true,
                  validator: (v) => (v == null || v.length < 6) ? "At least 6 characters" : null,
                ),
                const SizedBox(height: 22),
                ElevatedButton(
                  onPressed: loading ? null : submit,
                  child: loading
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text(signUp ? "Create $role account" : "Sign in"),
                ),
                const SizedBox(height: 14),
                Center(
                  child: TextButton(
                    onPressed: () => setState(() { signUp = !signUp; error = null; }),
                    child: Text(signUp ? "Already registered? Sign in" : "No account yet? Sign up", style: const TextStyle(color: WaziColors.rust, fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Label extends StatelessWidget {
  final String text;
  const _Label(this.text);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(text.toUpperCase(), style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: WaziColors.inkSoft, letterSpacing: 0.4)),
      );
}

class _RoleButton extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _RoleButton({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(9),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? WaziColors.greenTint : WaziColors.paper,
          border: Border.all(color: selected ? WaziColors.green : WaziColors.line, width: 1.4),
          borderRadius: BorderRadius.circular(9),
        ),
        child: Text(label, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5, color: selected ? WaziColors.greenDark : WaziColors.ink)),
      ),
    );
  }
}
